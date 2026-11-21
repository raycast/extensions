import { getPreferenceValues } from "@raycast/api";
import fs from "node:fs";
import path from "node:path";
import type { Project } from "./types";

export const AUDIO_EXTENSIONS = new Set([".wav", ".aif", ".aiff", ".mp3", ".m4a", ".flac"]);

export type Bounce = {
  name: string;
  path: string;
  createdAt: number;
  modifiedAt: number;
  size: number;
};

/** 按后缀判断是否为音频文件。 */
export function isAudioFile(fileName: string): boolean {
  return AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

/** 根据偏好里的 Bounces 子文件夹名，解析某个项目的 bounces 所在目录。 */
export function resolveBouncesFolder(projectPath: string): string {
  const folderName = (getPreferenceValues<Preferences>().bouncesFolderName ?? "").trim();
  return folderName ? path.join(projectPath, folderName) : projectPath;
}

/**
 * 列出某目录「顶层」的全部 bounce，不递归子文件夹。
 * statSync 会跟随 symlink，所以链接到外部文件夹的 bounce 也能读到。
 */
export function listBounces(folderPath: string): Bounce[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(folderPath);
  } catch {
    return [];
  }

  const bounces: Bounce[] = [];
  for (const entry of entries) {
    if (!isAudioFile(entry)) continue;
    const fullPath = path.join(folderPath, entry);
    try {
      const stats = fs.statSync(fullPath); // follows symlinks
      if (!stats.isFile()) continue;
      bounces.push({
        name: entry,
        path: fullPath,
        createdAt: stats.birthtimeMs,
        modifiedAt: stats.mtimeMs,
        size: stats.size,
      });
    } catch {
      continue;
    }
  }
  return bounces;
}

/** 统计某目录下的 bounce 数量：与 listBounces 口径一致（跟随 symlink、必须是文件），避免把同名目录当成音频。 */
export function countBounces(folderPath: string): number {
  return listBounces(folderPath).length;
}

/** 返回某目录下最近修改的 bounce 路径，没有则返回 null。
 *  用 mtime 而非 birthtime：重新导出覆盖同名文件时，修改时间才会更新。 */
export function findLatestBounce(folderPath: string): string | null {
  let latestPath: string | null = null;
  let latestModifiedAt = Number.NEGATIVE_INFINITY;

  for (const bounce of listBounces(folderPath)) {
    if (bounce.modifiedAt > latestModifiedAt) {
      latestModifiedAt = bounce.modifiedAt;
      latestPath = bounce.path;
    }
  }

  return latestPath;
}

// ───────────────── 共享 Bounces 文件夹 ─────────────────
// 所有项目的 bounce 导出到同一个文件夹（Package 项目没有自己的 Bounces 子文件夹），按文件名分给项目。

/** 偏好里的共享 Bounces 文件夹；没设时为 null。 */
export function resolveSharedBouncesFolder(): string | null {
  const folder = (getPreferenceValues<Preferences>().sharedBouncesFolder ?? "").trim();
  return folder || null;
}

// 项目名后面允许紧跟的字符：结尾、空格、-、_、.（如 "Song.wav"、"Song v2.wav"、"Song-master.wav"）。
const TITLE_BOUNDARY = new Set(["", " ", "-", "_", "."]);

/** 文件名是否以这个项目名开头（不区分大小写），且项目名后面是边界字符。"Songbird.wav" 不算 "Song" 的。 */
export function bounceMatchesTitle(fileName: string, title: string): boolean {
  const stem = fileName.slice(0, fileName.length - path.extname(fileName).length).toLowerCase();
  const name = title.toLowerCase();
  return name !== "" && stem.startsWith(name) && TITLE_BOUNDARY.has(stem.charAt(name.length));
}

/**
 * 把共享文件夹里的文件名分给项目，返回 项目名 → 文件名列表。
 * aliases 是 项目名 → 别名列表：文件名以别名开头时，同样归这个项目（规则和项目名一样）。
 * 一个文件同时对上好几个名字时，归最长的那个："Demo Package v2.wav" 归 "Demo Package"，不归 "Demo"。
 * 旧名字只认 before 之前创建的文件；被排除的文件不归这个项目，也不转给别的项目，留给 Unmatched。
 * 对不上任何项目的文件不出现在结果里。
 */
export type AssignOptions = {
  previousNames?: Record<string, PreviousBounceName[]>;
  exclusions?: Record<string, string[]>;
  // 文件的创建时间（毫秒）。只在对上旧名字时才调用；不给时，旧名字一律不认。
  createdAtOf?: (fileName: string) => number;
};

export function assignSharedBounces(
  fileNames: string[],
  titles: string[],
  aliases: Record<string, string[]> = {},
  options: AssignOptions = {},
): Map<string, string[]> {
  const names: { name: string; owner: string; before?: number }[] = [];
  for (const title of new Set(titles)) {
    names.push({ name: title, owner: title });
    for (const alias of aliases[title] ?? []) names.push({ name: alias, owner: title });
    for (const previous of options.previousNames?.[title] ?? []) {
      names.push({ name: previous.name, owner: title, before: previous.before });
    }
  }
  // 长的优先；一样长时，项目名和别名排在旧名字前面（旧名字和别的项目现在的名字相同时，归现在叫这个名字的项目）。
  names.sort(
    (a, b) => b.name.length - a.name.length || Number(a.before !== undefined) - Number(b.before !== undefined),
  );
  const result = new Map<string, string[]>();
  for (const fileName of fileNames) {
    if (!isAudioFile(fileName)) continue;
    const match = names.find(
      ({ name, before }) =>
        bounceMatchesTitle(fileName, name) &&
        (before === undefined || (options.createdAtOf?.(fileName) ?? Number.POSITIVE_INFINITY) < before),
    );
    if (match === undefined) continue;
    if (options.exclusions?.[match.owner]?.includes(fileName)) continue;
    const files = result.get(match.owner) ?? [];
    files.push(fileName);
    result.set(match.owner, files);
  }
  return result;
}

// 当前所有项目的名字。loadProjects 每次加载后更新；判断「名字最长的那个」要知道全部项目。
let sharedBounceTitles: string[] = [];
// 项目名 → 别名。别名存在项目元数据里（异步读取），套用元数据时更新；和项目名分开存，
// 这样别处再调 loadProjects 只会刷新项目名，不会把别名清掉。
let sharedBounceAliases: Record<string, string[]> = {};

export type PreviousBounceName = { name: string; before: number };
// 项目名 → 改名前的名字。和别名一样，在套用元数据时更新。
let sharedBouncePreviousNames: Record<string, PreviousBounceName[]> = {};
// 项目名 → 被标成「不属于这个项目」的文件名。
let sharedBounceExclusions: Record<string, string[]> = {};

export function setSharedBouncePreviousNames(previousNames: Record<string, PreviousBounceName[]>): void {
  sharedBouncePreviousNames = previousNames;
  sharedAssignment = null;
}

export function setSharedBounceExclusions(exclusions: Record<string, string[]>): void {
  sharedBounceExclusions = exclusions;
  sharedAssignment = null;
}

export function getSharedBounceExclusions(): Record<string, string[]> {
  return sharedBounceExclusions;
}

export function setSharedBounceTitles(titles: string[]): void {
  sharedBounceTitles = titles;
  sharedAssignment = null;
}

export function setSharedBounceAliases(aliases: Record<string, string[]>): void {
  sharedBounceAliases = aliases;
  sharedAssignment = null;
}

export function getSharedBounceAliases(): Record<string, string[]> {
  return sharedBounceAliases;
}

export function getSharedBounceTitles(): string[] {
  return sharedBounceTitles;
}

// 共享文件夹的分配结果，按文件夹路径 + mtime 缓存：增删、改名文件会改 mtime，届时重新读目录。
// 同名覆盖导出不改文件夹 mtime，但只影响文件的修改时间，不影响分配；修改时间在 listBounces 时实时读取。
let sharedAssignment: { key: string; byTitle: Map<string, string[]> } | null = null;

// 共享文件夹里某个文件的创建时间；读不到时当作「很新」，旧名字就不会认它。
function sharedCreatedAt(folder: string, fileName: string): number {
  try {
    return fs.statSync(path.join(folder, fileName)).birthtimeMs;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function sharedAssignOptions(folder: string): AssignOptions {
  return {
    previousNames: sharedBouncePreviousNames,
    exclusions: sharedBounceExclusions,
    createdAtOf: (fileName) => sharedCreatedAt(folder, fileName),
  };
}

// 按当前项目名和别名分配（带缓存）。读不到文件夹时抛出，由调用方处理。
function currentAssignment(folder: string): Map<string, string[]> {
  const key = `${folder}:${fs.statSync(folder).mtimeMs}`;
  if (sharedAssignment?.key !== key) {
    sharedAssignment = {
      key,
      byTitle: assignSharedBounces(
        fs.readdirSync(folder),
        sharedBounceTitles,
        sharedBounceAliases,
        sharedAssignOptions(folder),
      ),
    };
  }
  return sharedAssignment.byTitle;
}

/** 共享文件夹里归这个项目的 bounce 的完整路径。没设共享文件夹或读不到时为空。 */
export function sharedBounceFilesFor(title: string): string[] {
  const folder = resolveSharedBouncesFolder();
  if (!folder) return [];
  const toPaths = (byTitle: Map<string, string[]>) =>
    (byTitle.get(title) ?? []).map((fileName) => path.join(folder, fileName));
  try {
    // 项目不在已知名单里（还没加载过项目，或刚改名）：只按这一个名字分配，不写缓存，免得缓存里缺了别的项目。
    if (!sharedBounceTitles.includes(title)) {
      return toPaths(
        assignSharedBounces(fs.readdirSync(folder), [title], sharedBounceAliases, sharedAssignOptions(folder)),
      );
    }
    return toPaths(currentAssignment(folder));
  } catch {
    // 文件夹不存在或读不到（外接盘没接上等）：当作没有共享 bounce。
    return [];
  }
}

/**
 * 共享文件夹顶层里没归到任何项目的 bounce，最近修改的在前。
 * claimedFiles：各项目手动登记的外部文件（Assign to Project 选「只这一个文件」写进去的），这些也算已配对。
 */
export function unmatchedSharedBounces(claimedFiles: string[]): Bounce[] {
  const folder = resolveSharedBouncesFolder();
  if (!folder) return [];
  try {
    const assigned = new Set([...currentAssignment(folder).values()].flat());
    const claimed = new Set(claimedFiles.map(canonicalPath));
    return listBounces(folder)
      .filter((bounce) => !assigned.has(bounce.name) && !claimed.has(canonicalPath(bounce.path)))
      .sort((a, b) => b.modifiedAt - a.modifiedAt);
  } catch {
    return [];
  }
}

/** 从文件名猜一个别名：取第一个空格、-、_、. 之前的部分。"SC v2.wav" → "SC"。 */
export function guessAliasFromFileName(fileName: string): string {
  const stem = fileName.slice(0, fileName.length - path.extname(fileName).length);
  const cut = stem.search(/[ \-_.]/);
  return (cut > 0 ? stem.slice(0, cut) : stem).trim();
}

/**
 * 检查别名能不能给这个项目用，能用时返回 null，否则返回原因：
 * - "empty"：空的；
 * - { taken: 项目名 }：和另一个项目的名字或别名一样（不区分大小写），会分不清归谁。
 */
export function checkBounceAlias(
  alias: string,
  projectTitle: string,
  titles: string[],
  aliases: Record<string, string[]>,
): "empty" | { taken: string } | null {
  const name = alias.trim().toLowerCase();
  if (name === "") return "empty";
  for (const title of titles) {
    if (title === projectTitle) continue;
    if (title.toLowerCase() === name) return { taken: title };
    if ((aliases[title] ?? []).some((other) => other.toLowerCase() === name)) return { taken: title };
  }
  return null;
}

// ───────────────── 外部 bounce 来源聚合 ─────────────────
// 默认 Bounces 文件夹 + 共享文件夹 + 外部文件夹 + 外部文件，统一成带来源标记、去重后的列表。
// 所有 bounce 相关功能（Browse / Latest / Copy / 计数）都应改走这里。

export type BounceSourceKind = "project" | "shared" | "external";

export type BounceWithSource = Bounce & {
  source: BounceSourceKind;
  /** false = 记录在案但当前读不到（如外接盘未连接 / 文件被删）。保留路径，不计入可用。 */
  available: boolean;
  /** 外部来源的登记路径（外部文件夹或外部文件）；默认目录的 bounce 为 undefined。用于按来源移除。 */
  externalSource?: string;
};

export type BounceSourceInput = {
  defaultFolder: string;
  /** 共享文件夹里归这个项目的文件（完整路径），由 sharedBounceFilesFor 给出。 */
  sharedFiles?: string[];
  externalFolders?: string[];
  externalFiles?: string[];
};

/** 规范化真实路径用于去重（跟随 symlink；失败时回退原路径）。 */
export function canonicalPath(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
}

function unavailablePlaceholder(p: string): Bounce {
  return { name: path.basename(p), path: p, createdAt: 0, modifiedAt: 0, size: 0 };
}

// 读单个音频文件的信息；不存在、不是文件或不是音频时返回 null。
function statBounceFile(file: string): Bounce | null {
  try {
    const stats = fs.statSync(file);
    if (!stats.isFile() || !isAudioFile(file)) return null;
    return {
      name: path.basename(file),
      path: file,
      createdAt: stats.birthtimeMs,
      modifiedAt: stats.mtimeMs,
      size: stats.size,
    };
  } catch {
    return null;
  }
}

/**
 * 汇总一个项目的全部 bounce 来源。
 * - 默认目录标记 source:"project"，共享文件夹标记 source:"shared"，外部标记 source:"external"。
 * - 按规范化真实路径去重，优先级：默认目录 > 共享文件夹 > 外部。
 * - 记录在案但读不到的外部来源，产出 available:false 占位（保留路径，不自动删除）。
 */
export function collectBounces(input: BounceSourceInput): BounceWithSource[] {
  const seen = new Set<string>();
  const result: BounceWithSource[] = [];

  const push = (bounce: Bounce, source: BounceSourceKind, available: boolean, externalSource?: string) => {
    const key = canonicalPath(bounce.path);
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ ...bounce, source, available, externalSource });
  };

  // 1) 默认文件夹：优先占住去重键
  for (const bounce of listBounces(input.defaultFolder)) push(bounce, "project", true);

  // 2) 共享文件夹：按文件名分配来的；读不到的直接跳过（文件在别处被删了，不是用户登记的来源）。
  for (const file of input.sharedFiles ?? []) {
    const bounce = statBounceFile(file);
    if (bounce) push(bounce, "shared", true);
  }

  // 3) 外部文件夹：实时扫描；路径读不到则整条记为不可用占位。externalSource 记文件夹本身，供整体移除。
  for (const folder of input.externalFolders ?? []) {
    try {
      fs.accessSync(folder);
    } catch {
      push(unavailablePlaceholder(folder), "external", false, folder);
      continue;
    }
    for (const bounce of listBounces(folder)) push(bounce, "external", true, folder);
  }

  // 4) 外部单文件：externalSource 即文件自身路径
  for (const file of input.externalFiles ?? []) {
    // 不是文件、或不是音频：标成不可用，留在列表里方便移除，也不会被当成最新 bounce。
    const bounce = statBounceFile(file);
    if (bounce) push(bounce, "external", true, file);
    else push(unavailablePlaceholder(file), "external", false, file);
  }

  return result;
}

/** 可用 bounce 数（默认 + 共享 + 外部，去重后排除不可用）。 */
export function countBouncesWithSources(input: BounceSourceInput): number {
  return collectBounces(input).filter((bounce) => bounce.available).length;
}

/** 最近修改的可用 bounce 路径（含共享和外部），没有则 null。 */
export function findLatestBounceWithSources(input: BounceSourceInput): string | null {
  let latestPath: string | null = null;
  let latestModifiedAt = Number.NEGATIVE_INFINITY;
  for (const bounce of collectBounces(input)) {
    if (!bounce.available) continue;
    if (bounce.modifiedAt > latestModifiedAt) {
      latestModifiedAt = bounce.modifiedAt;
      latestPath = bounce.path;
    }
  }
  return latestPath;
}

type ProjectBounceSources = Pick<Project, "title" | "folderPath" | "externalBounceFolders" | "externalBounceFiles">;

// 项目 → bounce 来源（默认文件夹 + 共享文件夹 + 外部来源）。
export function projectBounceSources(project: ProjectBounceSources): BounceSourceInput {
  return {
    defaultFolder: resolveBouncesFolder(project.folderPath),
    sharedFiles: sharedBounceFilesFor(project.title),
    externalFolders: project.externalBounceFolders,
    externalFiles: project.externalBounceFiles,
  };
}

/** 某个项目的最新 bounce。播放、复制、排队、分析都走这里，避免各处口径不一。 */
export function findLatestProjectBounce(project: ProjectBounceSources): string | null {
  return findLatestBounceWithSources(projectBounceSources(project));
}

/** 某个项目的 bounce 数（去重、排除不可用）。 */
export function countProjectBounces(project: ProjectBounceSources): number {
  return countBouncesWithSources(projectBounceSources(project));
}
