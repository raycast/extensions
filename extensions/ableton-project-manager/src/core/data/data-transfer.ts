import fs from "node:fs";
import path from "node:path";
import { environment, LocalStorage } from "@raycast/api";
import {
  assertPrefixWritable,
  assertWritable,
  listKeySuffixes,
  readJson,
  StorageUnreadableError,
  updateJson,
} from "@/core/fs/storage";
import {
  getAllProjectMetadata,
  parseStore,
  withDefaults,
  type ProjectMetadata,
} from "@/core/metadata/project-metadata";
import {
  collectionTaxonomy,
  GENRE_DEFAULTS,
  genreTaxonomy,
  ROLE_DEFAULTS,
  roleTaxonomy,
  STAGE_DEFAULTS,
  stageTaxonomy,
} from "@/core/metadata/taxonomies";
import { parseOptions, type TaxonomyOption } from "@/core/metadata/taxonomy";
import { getPinnedCollections, parsePins } from "@/core/metadata/collection-pins";
import {
  getTrackMap,
  parseTrackMap,
  setTrackMap,
  removeTrackMap,
  type TrackMap,
} from "@/core/metadata/collection-order";
import { getRoleMap, parseRoleMap, setRoleMap, removeRoleMap, type RoleMap } from "@/core/metadata/collection-roles";
import { sameFolder, type FolderIdentity } from "@/core/fs/project-snapshot";
import { parseRecords } from "@/core/fs/deleted-projects";
import { DELETED_DOCS_FOLDER, type ArchivedDoc } from "@/core/docs/docs";
import type { Project } from "@/core/projects/types";

export const DATA_FORMAT = "daw-project-manager-data";
export const DATA_VERSION = 1;

const PROJECT_METADATA_KEY = "project-metadata";
const TAXONOMY_KEYS = ["stage-options", "genre-options", "collection-options", "role-options"] as const;
const PINS_KEY = "collection-pins";
const ORDER_PREFIX = "collection-order:";
const ROLE_PREFIX = "collection-roles:";
const DELETED_KEY = "deleted-projects";
const GENRE_SEED_KEY = "genre-options-seeded-v1";

// 有 order 的分类：追加的选项从现有最大 order 往后编号。
const ORDERED_KEYS: readonly string[] = ["stage-options", "role-options"];

const TAXONOMY_DEFAULTS: Record<string, TaxonomyOption[]> = {
  "stage-options": STAGE_DEFAULTS,
  "genre-options": GENRE_DEFAULTS,
  "collection-options": [],
  "role-options": ROLE_DEFAULTS,
};

export type DataSnapshot = {
  projectMetadata: Record<string, ProjectMetadata>;
  taxonomies: Record<string, TaxonomyOption[]>;
  collectionPins: string[];
  collectionOrders: Record<string, TrackMap>;
  collectionRoles: Record<string, RoleMap>;
  deletedProjects: DeletedRecord[];
};

export type DataFile = {
  format: string;
  version: number;
  extension: string;
  exportedAt: string;
  identities: Record<string, FolderIdentity>;
  data: DataSnapshot;
};

export type DeletedRecord = FolderIdentity & {
  id: string;
  deletedAt: number;
  metadata: ProjectMetadata | null;
  orders: Record<string, number>;
  roles: Record<string, string>;
  docs: ArchivedDoc[];
  dataRestored?: boolean;
};

/** 当前各存储的值，planImport 的输入。 */
export type CurrentData = DataSnapshot;

export type ImportChanges = {
  projects: number;
  options: number;
  collections: number;
  pins: number;
};

export type ImportResult = {
  restored: number;
  kept: number;
  rematched: number;
  unmatched: number;
  droppedTracks: number;
};

export type ImportPlan = {
  data: DataSnapshot;
  changes: ImportChanges;
  result: ImportResult;
  /** 新值和当前值完全一样。 */
  unchanged: boolean;
  /** 变更计数总和，决定要不要弹窗。 */
  changeCount: number;
};

export type ImportReport = ImportResult & {
  changes: ImportChanges;
  backupPath: string | null;
};

/** 哪一类数据损坏：用于提示里写明，而不是只说"数据读不出"。 */
export type CorruptDataKind = "metadata" | "categories" | "pins" | "orders" | "roles" | "deleted";

export class CorruptDataError extends StorageUnreadableError {
  readonly kind: CorruptDataKind;

  constructor(kind: CorruptDataKind) {
    super();
    this.kind = kind;
    this.name = "CorruptDataError";
  }
}

export class DataFileError extends Error {
  constructor(
    public readonly reason: "parse" | "format" | "version" | "extension" | "structure",
    message: string,
  ) {
    super(message);
    this.name = "DataFileError";
  }
}

// ---------- 校验 ----------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return `a ${typeof value}`;
}

/** 只查顶层类型：结构不对就拒绝，并写明是哪一块。 */
function requireObject(name: string, value: unknown): Record<string, unknown> {
  if (!isPlainObject(value)) {
    throw new DataFileError("structure", `${name}: expected an object, got ${describeType(value)}.`);
  }
  return value;
}

function requireArray(name: string, value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new DataFileError("structure", `${name}: expected an array, got ${describeType(value)}.`);
  }
  return value;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function invalid(at: string, expected: string, value: unknown): DataFileError {
  return new DataFileError("structure", `${at}: expected ${expected}, got ${describeType(value)}.`);
}

function checkTaxonomyOption(at: string, value: unknown): void {
  if (!isPlainObject(value)) throw invalid(at, "an object", value);
  for (const key of ["id", "name"]) {
    if (typeof value[key] !== "string") throw invalid(`${at}.${key}`, "a string", value[key]);
  }
  if (value.aliases !== undefined && !isStringArray(value.aliases)) {
    throw invalid(`${at}.aliases`, "an array of strings", value.aliases);
  }
  if (value.order !== undefined && !isFiniteNumber(value.order)) {
    throw invalid(`${at}.order`, "a number", value.order);
  }
  if (value.color !== undefined && typeof value.color !== "string") {
    throw invalid(`${at}.color`, "a string", value.color);
  }
}

const METADATA_STRING_ARRAYS = [
  "genreIds",
  "collectionIds",
  "externalBounceFolders",
  "externalBounceFiles",
  "bounceAliases",
  "excludedSharedBounces",
] as const;

/** 逐个字段查类型。缺的字段照常接受（旧版本导出的文件没有），类型不对就拒绝：写进存储后会让项目加载失败。 */
function checkMetadata(at: string, value: unknown): void {
  if (!isPlainObject(value)) throw invalid(at, "an object", value);
  for (const key of METADATA_STRING_ARRAYS) {
    if (value[key] !== undefined && !isStringArray(value[key])) {
      throw invalid(`${at}.${key}`, "an array of strings", value[key]);
    }
  }
  const { stageId, pinned, pinOrder, notes, previousBounceNames, externalBounceFingerprints } = value;
  if (stageId !== undefined && stageId !== null && typeof stageId !== "string") {
    throw invalid(`${at}.stageId`, "a string or null", stageId);
  }
  if (pinned !== undefined && typeof pinned !== "boolean") throw invalid(`${at}.pinned`, "a boolean", pinned);
  if (pinOrder !== undefined && pinOrder !== null && !isFiniteNumber(pinOrder)) {
    throw invalid(`${at}.pinOrder`, "a number or null", pinOrder);
  }
  if (notes !== undefined && typeof notes !== "string") throw invalid(`${at}.notes`, "a string", notes);
  if (
    previousBounceNames !== undefined &&
    !(
      Array.isArray(previousBounceNames) &&
      previousBounceNames.every(
        (item) => isPlainObject(item) && typeof item.name === "string" && isFiniteNumber(item.before),
      )
    )
  ) {
    throw invalid(`${at}.previousBounceNames`, "an array of { name, before }", previousBounceNames);
  }
  if (
    externalBounceFingerprints !== undefined &&
    !(
      isPlainObject(externalBounceFingerprints) &&
      Object.values(externalBounceFingerprints).every(
        (item) => isPlainObject(item) && isFiniteNumber(item.size) && isFiniteNumber(item.mtimeMs),
      )
    )
  ) {
    throw invalid(`${at}.externalBounceFingerprints`, "an object of { size, mtimeMs }", externalBounceFingerprints);
  }
}

/** 归档文档的路径只能落在 Deleted Projects/ 里：还原时会按这个路径挪文件。 */
function isSafeArchivePath(value: unknown): boolean {
  if (typeof value !== "string" || path.isAbsolute(value)) return false;
  const normalized = path.normalize(value);
  return normalized.startsWith(DELETED_DOCS_FOLDER + path.sep) && !normalized.split(path.sep).includes("..");
}

/** 逐条校验删除记录：放回项目时会按记录挪文档文件，结构不对就整份拒绝。 */
function checkDeletedRecords(values: unknown[]): unknown[] {
  values.forEach((record, index) => {
    const at = `deletedProjects[${index}]`;
    if (!isPlainObject(record)) throw invalid(at, "an object", record);
    const { id, deletedAt, birthtimeMs, inode, metadata, orders, roles, docs, dataRestored } = record;
    if (typeof id !== "string") throw invalid(`${at}.id`, "a string", id);
    if (!isFiniteNumber(deletedAt)) throw invalid(`${at}.deletedAt`, "a number", deletedAt);
    if (!isFiniteNumber(birthtimeMs)) throw invalid(`${at}.birthtimeMs`, "a number", birthtimeMs);
    if (inode !== undefined && !isFiniteNumber(inode)) throw invalid(`${at}.inode`, "a number", inode);
    if (metadata !== null) checkMetadata(`${at}.metadata`, metadata);
    if (!isPlainObject(orders) || !Object.values(orders).every(isFiniteNumber)) {
      throw invalid(`${at}.orders`, "an object of numbers", orders);
    }
    if (!isPlainObject(roles) || !Object.values(roles).every((role) => typeof role === "string")) {
      throw invalid(`${at}.roles`, "an object of strings", roles);
    }
    if (dataRestored !== undefined && typeof dataRestored !== "boolean") {
      throw invalid(`${at}.dataRestored`, "a boolean", dataRestored);
    }
    if (!Array.isArray(docs)) throw invalid(`${at}.docs`, "an array", docs);
    docs.forEach((doc, docIndex) => {
      const valid =
        isPlainObject(doc) && (doc.kind === "notes" || doc.kind === "lyrics") && isSafeArchivePath(doc.relativePath);
      if (!valid) throw invalid(`${at}.docs[${docIndex}]`, "a document inside Deleted Projects", doc);
    });
  });
  return values;
}

/** 只校验、不修正：任何会被现有 parse 函数丢弃或改写的结构都算不合法。 */
export function parseDataFile(raw: string, extensionName: string): DataFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DataFileError("parse", "The file is not valid JSON.");
  }

  if (!isPlainObject(parsed)) throw new DataFileError("structure", "The file has an unexpected structure.");
  if (parsed.format !== DATA_FORMAT) throw new DataFileError("format", "This is not an exported data file.");
  if (parsed.version !== DATA_VERSION) {
    throw new DataFileError("version", `Version ${String(parsed.version)} is not supported.`);
  }
  if (parsed.extension !== extensionName) {
    throw new DataFileError("extension", `The file was exported by "${String(parsed.extension)}".`);
  }

  const data = requireObject("data", parsed.data);

  // 项目元数据、分类选项和删除记录逐项查类型（写入后会被直接使用），其余只查顶层；
  // 过期记录、缺的字段照常接受，导入时写入 parse 之后的值。
  const rawMetadata = requireObject("projectMetadata", data.projectMetadata);
  // 旧版本导出的文件可能缺字段：补上默认值，后面合并和写入都按完整的结构处理。
  const projectMetadata: Record<string, ProjectMetadata> = {};
  for (const [id, meta] of Object.entries(rawMetadata)) {
    checkMetadata(`projectMetadata.${id}`, meta);
    projectMetadata[id] = withDefaults(meta as Partial<ProjectMetadata>);
  }

  const rawTaxonomies = requireObject("taxonomies", data.taxonomies);
  const taxonomies: Record<string, TaxonomyOption[]> = {};
  for (const key of TAXONOMY_KEYS) {
    const options = requireArray(`taxonomies.${key}`, rawTaxonomies[key]);
    options.forEach((option, index) => checkTaxonomyOption(`taxonomies.${key}[${index}]`, option));
    taxonomies[key] = parseOptions(options);
  }

  const collectionPins = parsePins(requireArray("collectionPins", data.collectionPins));

  const collectionOrders: Record<string, TrackMap> = {};
  for (const [id, map] of Object.entries(requireObject("collectionOrders", data.collectionOrders))) {
    collectionOrders[id] = parseTrackMap(map);
  }

  const collectionRoles: Record<string, RoleMap> = {};
  for (const [id, map] of Object.entries(requireObject("collectionRoles", data.collectionRoles))) {
    collectionRoles[id] = parseRoleMap(map);
  }

  const deletedProjects = parseRecords(checkDeletedRecords(requireArray("deletedProjects", data.deletedProjects)));

  const identities = isPlainObject(parsed.identities) ? parsed.identities : {};
  const cleanIdentities: Record<string, FolderIdentity> = {};
  for (const [id, identity] of Object.entries(identities)) {
    if (isPlainObject(identity) && typeof identity.birthtimeMs === "number") {
      cleanIdentities[id] = {
        birthtimeMs: identity.birthtimeMs,
        inode: typeof identity.inode === "number" ? identity.inode : undefined,
      };
    }
  }

  return {
    format: DATA_FORMAT,
    version: DATA_VERSION,
    extension: extensionName,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    identities: cleanIdentities,
    data: {
      projectMetadata,
      taxonomies,
      collectionPins,
      collectionOrders,
      collectionRoles,
      deletedProjects,
    },
  };
}

// ---------- 导出 ----------

async function checkWritable(kind: CorruptDataKind, check: () => Promise<void>): Promise<void> {
  try {
    await check();
  } catch (error) {
    if (error instanceof StorageUnreadableError) throw new CorruptDataError(kind);
    throw error;
  }
}

/** 导出前预检：任何一份要导出的存储损坏就拒绝，避免导出一份看起来正常、其实丢了数据的备份。 */
export async function assertExportable(): Promise<void> {
  await checkWritable("metadata", () => assertWritable(PROJECT_METADATA_KEY));
  for (const key of TAXONOMY_KEYS) await checkWritable("categories", () => assertWritable(key));
  await checkWritable("pins", () => assertWritable(PINS_KEY));
  await checkWritable("deleted", () => assertWritable(DELETED_KEY));
  await checkWritable("orders", () => assertPrefixWritable(ORDER_PREFIX));
  await checkWritable("roles", () => assertPrefixWritable(ROLE_PREFIX));
}

function readDeletedRecords(): Promise<DeletedRecord[]> {
  return readJson<DeletedRecord[]>(DELETED_KEY, parseRecords, () => []);
}

async function readOrders(): Promise<Record<string, TrackMap>> {
  const out: Record<string, TrackMap> = {};
  for (const collectionId of await listKeySuffixes(ORDER_PREFIX)) {
    out[collectionId] = await getTrackMap(collectionId);
  }
  return out;
}

async function readRoles(): Promise<Record<string, RoleMap>> {
  const out: Record<string, RoleMap> = {};
  for (const collectionId of await listKeySuffixes(ROLE_PREFIX)) {
    out[collectionId] = await getRoleMap(collectionId);
  }
  return out;
}

/** 项目文件夹的身份：用文件夹本身，不用 Project.createdAt（它可能是子文件夹的创建时间）。 */
export function collectIdentities(projects: Project[]): Record<string, FolderIdentity> {
  const identities: Record<string, FolderIdentity> = {};
  for (const project of projects) {
    try {
      const stats = fs.statSync(project.folderPath);
      identities[project.id] = { birthtimeMs: stats.birthtimeMs, inode: stats.ino };
    } catch {
      // 文件夹不可用：跳过这一项，导出照常进行。
    }
  }
  return identities;
}

export async function buildSnapshot(projects: Project[]): Promise<DataFile> {
  await assertExportable();

  const taxonomies: Record<string, TaxonomyOption[]> = {
    "stage-options": await stageTaxonomy.get(),
    // Genre 走 get()：文件里存的一定是补过默认值之后的状态。
    "genre-options": await genreTaxonomy.get(),
    "collection-options": await collectionTaxonomy.get(),
    "role-options": await roleTaxonomy.get(),
  };

  // 每一块都过一遍和导入相同的 parse：导出的文件本身就是干净的。
  const rawTaxonomies: Record<string, TaxonomyOption[]> = {};
  for (const key of TAXONOMY_KEYS) rawTaxonomies[key] = parseOptions(taxonomies[key]);

  const rawOrders = await readOrders();
  const collectionOrders: Record<string, TrackMap> = {};
  for (const [id, map] of Object.entries(rawOrders)) collectionOrders[id] = parseTrackMap(map);

  const rawRoles = await readRoles();
  const collectionRoles: Record<string, RoleMap> = {};
  for (const [id, map] of Object.entries(rawRoles)) collectionRoles[id] = parseRoleMap(map);

  return {
    format: DATA_FORMAT,
    version: DATA_VERSION,
    extension: environment.extensionName,
    exportedAt: new Date().toISOString(),
    identities: collectIdentities(projects),
    data: {
      projectMetadata: parseStore(await getAllProjectMetadata()),
      taxonomies: rawTaxonomies,
      collectionPins: parsePins(await getPinnedCollections()),
      collectionOrders,
      collectionRoles,
      deletedProjects: parseRecords(await readDeletedRecords()),
    },
  };
}

/** 读取当前全部可导入的存储，作为 planImport 的输入。 */
export async function readCurrentData(): Promise<CurrentData> {
  return {
    // 存储里的旧数据也可能缺字段，和导入的数据一样补上默认值再比较、合并。
    projectMetadata: Object.fromEntries(
      Object.entries(await getAllProjectMetadata()).map(([id, meta]) => [id, withDefaults(meta)]),
    ),
    taxonomies: {
      "stage-options": await stageTaxonomy.get(),
      "genre-options": await genreTaxonomy.get(),
      "collection-options": await collectionTaxonomy.get(),
      "role-options": await roleTaxonomy.get(),
    },
    collectionPins: await getPinnedCollections(),
    collectionOrders: await readOrders(),
    collectionRoles: await readRoles(),
    deletedProjects: await readDeletedRecords(),
  };
}

// ---------- 文件命名 ----------

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function exportFileName(now: Date): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${environment.extensionName}-data-${date}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
}

export function backupFileName(now: Date): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${environment.extensionName}-backup-before-import-${date}-${time}.json`;
}

/** 撞名时在 .json 前依次加 " 2"、" 3"……；用 wx 写入，避免检查和写入之间的竞态。 */
export function writeJsonFile(folder: string, fileName: string, content: string): string {
  const base = fileName.endsWith(".json") ? fileName.slice(0, -".json".length) : fileName;
  for (let index = 1; index < 1000; index += 1) {
    const candidate = path.join(folder, index === 1 ? `${base}.json` : `${base} ${index}.json`);
    try {
      fs.writeFileSync(candidate, content, { encoding: "utf8", flag: "wx" });
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "EEXIST") continue;
      throw error;
    }
  }
  throw new Error("Could not find an unused file name.");
}

export async function exportData(folder: string, projects: Project[]): Promise<string> {
  const snapshot = await buildSnapshot(projects);
  return writeJsonFile(folder, exportFileName(new Date()), JSON.stringify(snapshot, null, 2));
}

// ---------- 改名追踪 ----------

type RenameResult = {
  data: DataSnapshot;
  identities: Record<string, FolderIdentity>;
  rematched: number;
  unmatched: number;
  skipped: boolean;
};

function projectIdsIn(data: DataSnapshot): Set<string> {
  const ids = new Set<string>(Object.keys(data.projectMetadata));
  for (const map of Object.values(data.collectionOrders)) for (const id of Object.keys(map)) ids.add(id);
  for (const map of Object.values(data.collectionRoles)) for (const id of Object.keys(map)) ids.add(id);
  return ids;
}

function renameProjectId(data: DataSnapshot, from: string, to: string): void {
  if (from in data.projectMetadata) {
    data.projectMetadata[to] = data.projectMetadata[from];
    delete data.projectMetadata[from];
  }
  for (const map of Object.values(data.collectionOrders)) {
    if (from in map) {
      map[to] = map[from];
      delete map[from];
    }
  }
  for (const map of Object.values(data.collectionRoles)) {
    if (from in map) {
      map[to] = map[from];
      delete map[from];
    }
  }
}

/** 文件里的项目 ID 是旧名、而当前文件夹已改名时，把数据挪到新 ID 下。 */
export function trackRenames(
  data: DataSnapshot,
  identities: Record<string, FolderIdentity>,
  projects: Project[] | null,
): RenameResult {
  const copy: DataSnapshot = JSON.parse(JSON.stringify(data)) as DataSnapshot;
  const renamedIdentities: Record<string, FolderIdentity> = { ...identities };
  if (!projects) return { data: copy, identities: renamedIdentities, rematched: 0, unmatched: 0, skipped: true };

  const currentIds = new Set(projects.map((project) => project.id));
  const currentIdentities = collectIdentities(projects);
  let rematched = 0;
  let unmatched = 0;

  const dataIds = projectIdsIn(copy);
  // 只有身份、没有数据的项目也要跟着文件夹走：否则它的旧名字仍算「快照知道的项目」，占用旧名字的新项目的数据会被清掉。
  const ids = new Set([...dataIds, ...Object.keys(identities)]);
  for (const id of ids) {
    // 只有身份的项目不计入 rematched / unmatched：这两个数字说的是有数据的项目。
    const hasData = dataIds.has(id);
    const identity = identities[id];
    if (currentIds.has(id)) {
      // 名字还在：是同一个文件夹（或没法比对）才留在原处；名字被另一个文件夹占了，就去找原来的文件夹。
      const current = currentIdentities[id];
      if (!identity || !current || sameFolder(identity, current)) continue;
    }
    const target = identity
      ? projects.find((project) => {
          const current = currentIdentities[project.id];
          return current !== undefined && sameFolder(identity, current);
        })
      : undefined;

    if (!target || target.id === id) {
      if (hasData) unmatched += 1;
      continue;
    }
    // 目标 ID 在文件里已有自己的条目或身份：不改，计入未匹配。
    if (projectIdsIn(copy).has(target.id) || target.id in renamedIdentities) {
      if (hasData) unmatched += 1;
      continue;
    }
    renameProjectId(copy, id, target.id);
    // 身份跟着挪：否则旧名字仍算「快照知道的项目」，占用旧名字的新项目的数据会被清掉。
    renamedIdentities[target.id] = renamedIdentities[id];
    delete renamedIdentities[id];
    if (hasData) rematched += 1;
  }

  return { data: copy, identities: renamedIdentities, rematched, unmatched, skipped: false };
}

// ---------- 计划 ----------

/** 稳定序列化：key 排序后再比较，避免字段顺序不同被当成变化。 */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sameValue(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/** 比较用：去掉空的曲序和角色 map，让"没有 key"和"空 map"算同一种状态。 */
function withoutEmptyMaps(data: DataSnapshot): DataSnapshot {
  const keep = <T>(maps: Record<string, T>): Record<string, T> => {
    const out: Record<string, T> = {};
    for (const [id, map] of Object.entries(maps)) {
      if (Object.keys(map as object).length > 0) out[id] = map;
    }
    return out;
  };
  return {
    ...data,
    collectionOrders: keep(data.collectionOrders),
    collectionRoles: keep(data.collectionRoles),
  };
}

type PlannedTaxonomy = {
  options: TaxonomyOption[];
  /** 当前选项 ID → 名字，用来在引用失效时按名字找回。 */
  currentNames: Map<string, string>;
  /** 当前独有、但因为同名被并掉的选项数量。 */
  merged: number;
};

/** 文件里的选项在前；当前独有的先按名字合并，合并不上的追加在后。有 order 的分类给追加项续编号。 */
function planTaxonomy(key: string, current: TaxonomyOption[], incoming: TaxonomyOption[]): PlannedTaxonomy {
  const out = incoming.map((option) => ({ ...option }));
  const seen = new Set(out.map((option) => option.id));
  const byName = new Map(out.map((option) => [nameKey(option.name), option.id]));
  const appended: TaxonomyOption[] = [];
  let merged = 0;

  for (const option of current) {
    if (seen.has(option.id)) continue;
    // 同名选项：不追加，引用会按名字改写到文件里的那个 ID。
    if (byName.has(nameKey(option.name))) {
      merged += 1;
      continue;
    }
    appended.push({ ...option });
  }

  if (ORDERED_KEYS.includes(key) && appended.length > 0) {
    let next = out.reduce((max, option) => Math.max(max, option.order ?? 0), 0);
    for (const option of appended) {
      next += 1;
      option.order = next;
    }
  }

  return {
    options: [...out, ...appended],
    currentNames: new Map(current.map((option) => [option.id, option.name])),
    merged,
  };
}

/** 引用修正：ID 不在最终列表里时，按它原来的名字找同名选项；找不到就去掉。 */
function fixReferences(ids: string[], options: TaxonomyOption[], currentNames: Map<string, string>): string[] {
  const byId = new Set(options.map((option) => option.id));
  const byName = new Map(options.map((option) => [nameKey(option.name), option.id]));
  const out: string[] = [];
  for (const id of ids) {
    const resolved = byId.has(id) ? id : byName.get(nameKey(currentNames.get(id) ?? id));
    if (resolved === undefined) continue;
    if (!out.includes(resolved)) out.push(resolved);
  }
  return out;
}

function fixStageId(
  stageId: string | null,
  options: TaxonomyOption[],
  currentNames: Map<string, string>,
): string | null {
  if (stageId === null) return null;
  return fixReferences([stageId], options, currentNames)[0] ?? null;
}

function unionDeleted(current: DeletedRecord[], incoming: DeletedRecord[]): DeletedRecord[] {
  const seen = new Set(current.map((record) => `${record.id}\n${record.deletedAt}`));
  const out = [...current];
  for (const record of incoming) {
    const key = `${record.id}\n${record.deletedAt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(record);
  }
  return out;
}

/**
 * 按快照恢复：快照知道的项目用文件里的值，快照之后新增的东西保留。
 * 纯函数，不读写存储。
 */
export function planImport(file: DataFile, current: CurrentData, projects: Project[] | null): ImportPlan {
  const tracked = trackRenames(file.data, file.identities, projects);
  const incoming = tracked.data;

  // 快照知道的项目：ID 在 identities 里，或在文件的元数据里。
  const known = new Set<string>([...Object.keys(tracked.identities), ...Object.keys(incoming.projectMetadata)]);

  const taxonomies: Record<string, TaxonomyOption[]> = {};
  const currentNames: Record<string, Map<string, string>> = {};
  const mergedOptions: Record<string, number> = {};
  for (const key of TAXONOMY_KEYS) {
    const planned = planTaxonomy(key, current.taxonomies[key] ?? [], incoming.taxonomies[key] ?? []);
    taxonomies[key] = planned.options;
    currentNames[key] = planned.currentNames;
    mergedOptions[key] = planned.merged;
  }

  // 收藏夹 ID 的解析：先看最终列表，再按原来的名字找同名选项。
  const collectionOptions = taxonomies["collection-options"];
  const collectionIds = new Set(collectionOptions.map((option) => option.id));
  const collectionByName = new Map(collectionOptions.map((option) => [nameKey(option.name), option.id]));
  const collectionNames = currentNames["collection-options"];
  function resolveCollectionId(id: string): string {
    if (collectionIds.has(id)) return id;
    return collectionByName.get(nameKey(collectionNames.get(id) ?? id)) ?? id;
  }

  const metadata: Record<string, ProjectMetadata> = {};
  let restored = 0;
  let kept = 0;
  for (const [id, meta] of Object.entries(current.projectMetadata)) {
    if (known.has(id)) continue;
    metadata[id] = {
      ...meta,
      stageId: fixStageId(meta.stageId, taxonomies["stage-options"], currentNames["stage-options"]),
      genreIds: fixReferences(meta.genreIds, taxonomies["genre-options"], currentNames["genre-options"]),
      collectionIds: fixReferences(meta.collectionIds, collectionOptions, collectionNames),
    };
    kept += 1;
  }
  for (const [id, meta] of Object.entries(incoming.projectMetadata)) {
    metadata[id] = {
      ...meta,
      stageId: fixStageId(meta.stageId, taxonomies["stage-options"], currentNames["stage-options"]),
      genreIds: fixReferences(meta.genreIds, taxonomies["genre-options"], currentNames["genre-options"]),
      collectionIds: fixReferences(meta.collectionIds, collectionOptions, collectionNames),
    };
    restored += 1;
  }

  // 当前 map 的收藏夹 key 先按同名合并改写，再和文件里的 map 合并。
  const currentOrders: Record<string, TrackMap> = {};
  for (const [id, map] of Object.entries(current.collectionOrders)) {
    const target = resolveCollectionId(id);
    const merged = { ...(currentOrders[target] ?? {}) };
    for (const [projectId, number] of Object.entries(map)) {
      if (!(projectId in merged)) merged[projectId] = number;
    }
    currentOrders[target] = merged;
  }
  const roleOptions = taxonomies["role-options"];
  const restoredRoleNames = new Map(roleOptions.map((option) => [option.id, option.name]));
  const currentRoleNames = new Map<string, string>();
  for (const option of current.taxonomies["role-options"] ?? []) {
    const [restoredId] = fixReferences([option.id], roleOptions, currentNames["role-options"]);
    currentRoleNames.set(option.name, restoredRoleNames.get(restoredId) ?? option.name);
  }
  const currentRoles: Record<string, RoleMap> = {};
  for (const [id, map] of Object.entries(current.collectionRoles)) {
    const target = resolveCollectionId(id);
    const merged = { ...(currentRoles[target] ?? {}) };
    for (const [projectId, role] of Object.entries(map)) {
      if (!(projectId in merged)) merged[projectId] = currentRoleNames.get(role) ?? role;
    }
    currentRoles[target] = merged;
  }

  const orders: Record<string, TrackMap> = {};
  const roles: Record<string, RoleMap> = {};
  let droppedTracks = 0;
  const allCollectionIds = new Set([
    ...Object.keys(current.collectionOrders),
    ...Object.keys(current.collectionRoles),
    ...Object.keys(incoming.collectionOrders),
    ...Object.keys(incoming.collectionRoles),
  ]);
  const plannedCollectionIds = new Set([
    ...Object.keys(currentOrders),
    ...Object.keys(currentRoles),
    ...Object.keys(incoming.collectionOrders),
    ...Object.keys(incoming.collectionRoles),
  ]);

  // 快照是否认识这个收藏夹，看它在不在文件的 collection-options 里；
  // 快照时没设过曲序或角色的收藏夹，文件里本来就可能没有对应的 map key。
  const fileCollectionIds = new Set((incoming.taxonomies["collection-options"] ?? []).map((option) => option.id));

  for (const collectionId of plannedCollectionIds) {
    const fileOrders = incoming.collectionOrders[collectionId];
    const fileRoles = incoming.collectionRoles[collectionId];

    if (!fileCollectionIds.has(resolveCollectionId(collectionId))) {
      // 快照不知道的收藏夹：当前 map 整个保留。
      if (currentOrders[collectionId]) orders[collectionId] = currentOrders[collectionId];
      if (currentRoles[collectionId]) roles[collectionId] = currentRoles[collectionId];
      continue;
    }

    // 快照知道的收藏夹：从文件的 map 出发，没有就当作空 map。
    const map: TrackMap = { ...(fileOrders ?? {}) };
    const taken = new Set(Object.values(map));
    for (const [projectId, number] of Object.entries(currentOrders[collectionId] ?? {})) {
      if (known.has(projectId)) continue;
      // 同一个项目两边都有：以文件的条目为准。
      if (projectId in map) continue;
      if (taken.has(number)) {
        droppedTracks += 1;
        continue;
      }
      map[projectId] = number;
      taken.add(number);
    }
    // 空 map 不写入：没有 key 和空 map 视为同一种状态。
    if (Object.keys(map).length > 0) orders[collectionId] = map;

    const roleMap: RoleMap = { ...(fileRoles ?? {}) };
    for (const [projectId, role] of Object.entries(currentRoles[collectionId] ?? {})) {
      if (known.has(projectId)) continue;
      if (projectId in roleMap) continue;
      roleMap[projectId] = role;
    }
    if (Object.keys(roleMap).length > 0) roles[collectionId] = roleMap;
  }

  const pins: string[] = [];
  for (const id of incoming.collectionPins) {
    if (!pins.includes(id)) pins.push(id);
  }
  for (const id of current.collectionPins) {
    const mapped = resolveCollectionId(id);
    if (!pins.includes(mapped)) pins.push(mapped);
  }

  // 过期的删除记录不写入：和存储读取时用同一个 parse。
  const deleted = unionDeleted(current.deletedProjects, parseRecords(incoming.deletedProjects));

  // 变更计数：只算现有值被改掉或被清空，新增不算。
  let projectChanges = 0;
  for (const [id, meta] of Object.entries(current.projectMetadata)) {
    const next = metadata[id];
    if (next === undefined || !sameValue(meta, next)) projectChanges += 1;
  }

  let optionChanges = 0;
  for (const key of TAXONOMY_KEYS) {
    const currentOptions = current.taxonomies[key] ?? [];
    // 整个分类和默认值一样时，这个分类的改动都不计入。
    if (sameValue(currentOptions, TAXONOMY_DEFAULTS[key] ?? [])) continue;
    // 当前独有、因为同名被并掉的选项，每并掉一个计 1 项。
    optionChanges += mergedOptions[key] ?? 0;
    const nextById = new Map(taxonomies[key].map((option) => [option.id, option]));
    for (const option of currentOptions) {
      const next = nextById.get(option.id);
      if (!next) continue;
      // 比较整个选项：aliases 等字段不同也算变更。
      if (!sameValue(option, next)) optionChanges += 1;
    }
  }

  let collectionChanges = 0;
  for (const collectionId of allCollectionIds) {
    const target = resolveCollectionId(collectionId);
    const ordersChanged = !sameValue(current.collectionOrders[collectionId] ?? {}, orders[target] ?? {});
    const rolesChanged = !sameValue(current.collectionRoles[collectionId] ?? {}, roles[target] ?? {});
    if (ordersChanged || rolesChanged) collectionChanges += 1;
  }

  const pinChanges = sameValue(current.collectionPins, pins) ? 0 : 1;

  const changes: ImportChanges = {
    projects: projectChanges,
    options: optionChanges,
    collections: collectionChanges,
    pins: pinChanges,
  };
  const changeCount = projectChanges + optionChanges + collectionChanges + pinChanges;

  const data: DataSnapshot = {
    projectMetadata: metadata,
    taxonomies,
    collectionPins: pins,
    collectionOrders: orders,
    collectionRoles: roles,
    deletedProjects: deleted,
  };

  return {
    data,
    changes,
    result: {
      restored,
      kept,
      rematched: tracked.rematched,
      unmatched: tracked.unmatched,
      droppedTracks,
    },
    unchanged: sameValue(withoutEmptyMaps(current), withoutEmptyMaps(data)),
    changeCount,
  };
}

// ---------- 写入 ----------

async function assertImportWritable(orders: Record<string, TrackMap>, roles: Record<string, RoleMap>): Promise<void> {
  await checkWritable("metadata", () => assertWritable(PROJECT_METADATA_KEY));
  for (const key of TAXONOMY_KEYS) await checkWritable("categories", () => assertWritable(key));
  await checkWritable("pins", () => assertWritable(PINS_KEY));
  await checkWritable("deleted", () => assertWritable(DELETED_KEY));
  await checkWritable("orders", () => assertPrefixWritable(ORDER_PREFIX));
  await checkWritable("roles", () => assertPrefixWritable(ROLE_PREFIX));
  for (const collectionId of Object.keys(orders)) {
    await checkWritable("orders", () => assertWritable(ORDER_PREFIX + collectionId));
  }
  for (const collectionId of Object.keys(roles)) {
    await checkWritable("roles", () => assertWritable(ROLE_PREFIX + collectionId));
  }
}

/** 导入前预检：任何要写的存储损坏就抛 CorruptDataError，此时一个字都不写。 */
export async function assertImportReady(file: DataFile): Promise<void> {
  await assertImportWritable(file.data.collectionOrders, file.data.collectionRoles);
}

/** 把计划写进存储。顺序：分类 → 元数据 → 置顶 → 曲序 → 角色 → deleted-projects。 */
export async function applyPlan(plan: ImportPlan, current: CurrentData): Promise<void> {
  for (const key of TAXONOMY_KEYS) {
    await updateJson(
      key,
      (value) => (Array.isArray(value) ? (value as TaxonomyOption[]) : []),
      () => [],
      () => plan.data.taxonomies[key],
    );
  }
  await LocalStorage.setItem(GENRE_SEED_KEY, "true");

  await updateJson(
    PROJECT_METADATA_KEY,
    (value) => (isPlainObject(value) ? value : {}),
    () => ({}),
    () => plan.data.projectMetadata,
  );
  await updateJson(
    PINS_KEY,
    (value) => (isStringArray(value) ? value : []),
    () => [],
    () => plan.data.collectionPins,
  );

  for (const [collectionId, map] of Object.entries(plan.data.collectionOrders)) {
    await setTrackMap(collectionId, map);
  }
  for (const collectionId of Object.keys(current.collectionOrders)) {
    if (!(collectionId in plan.data.collectionOrders)) await removeTrackMap(collectionId);
  }

  for (const [collectionId, map] of Object.entries(plan.data.collectionRoles)) {
    await setRoleMap(collectionId, map);
  }
  for (const collectionId of Object.keys(current.collectionRoles)) {
    if (!(collectionId in plan.data.collectionRoles)) await removeRoleMap(collectionId);
  }

  await updateJson(
    DELETED_KEY,
    (value) => (Array.isArray(value) ? (value as DeletedRecord[]) : []),
    () => [],
    () => plan.data.deletedProjects,
  );
}

/** 备份当前数据到指定文件夹；失败就抛错，调用方据此中止。 */
export async function writeBackup(folder: string, projects: Project[]): Promise<string> {
  const snapshot = await buildSnapshot(projects);
  return writeJsonFile(folder, backupFileName(new Date()), JSON.stringify(snapshot, null, 2));
}

/** 一步完成：预检、计划、备份、写入。备份失败时不做任何改动。 */
export async function replaceData(
  file: DataFile,
  projects: Project[] | null,
  backupFolder: string,
): Promise<ImportReport> {
  // 先预检：分类的 get() 在存储损坏时会悄悄返回默认值，读之前必须先确认能写。
  await assertImportWritable(file.data.collectionOrders, file.data.collectionRoles);

  const current = await readCurrentData();
  const plan = planImport(file, current, projects);

  if (plan.unchanged) {
    return { ...plan.result, changes: plan.changes, backupPath: null };
  }

  const backupPath = await writeBackup(backupFolder, projects ?? []);
  await applyPlan(plan, current);
  return { ...plan.result, changes: plan.changes, backupPath };
}
