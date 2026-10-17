import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import { environment } from "@raycast/api";
import { commitItem } from "./git";
import { checkedIndependentItem, type VaultItem } from "./items";

type Side = "default" | "target";
type Kind = "json-key" | "array-entry" | "file";

export interface SelectiveChange {
  id: string;
  kind: Kind;
  relativePath: string;
  label: string;
  defaultValue: string;
  targetValue: string;
  defaultHash: string | null;
  targetHash: string | null;
  key?: string;
  entry?: string;
}

export interface SelectiveSyncResult {
  backup: string | null;
  historyWarning?: string;
}

const MAX_FILES = 400;
const MAX_BYTES = 8 * 1024 * 1024;

function hash(content: Buffer | null): string | null {
  return content === null ? null : createHash("sha256").update(content).digest("hex");
}

function preview(value: unknown, exists: boolean): string {
  if (!exists) return "Absent";
  const result = JSON.stringify(value);
  return result === undefined ? "Absent" : result.length > 140 ? result.slice(0, 137) + "…" : result;
}

function record(
  kind: Kind,
  relativePath: string,
  label: string,
  defaultValue: string,
  targetValue: string,
  defaultHash: string | null,
  targetHash: string | null,
  key?: string,
  entry?: string,
): SelectiveChange {
  return {
    id: JSON.stringify([kind, relativePath, key, entry]),
    kind,
    relativePath,
    label,
    defaultValue,
    targetValue,
    defaultHash,
    targetHash,
    key,
    entry,
  };
}

async function physicalFile(filePath: string): Promise<Buffer | null> {
  try {
    const stat = await fs.lstat(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Unsupported file or link: ${filePath}`);
    if (stat.size > MAX_BYTES) throw new Error(`File is too large for selective sync: ${filePath}`);
    return await fs.readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function collectFiles(root: string): Promise<string[]> {
  const output: string[] = [];
  async function walk(current: string, prefix: string): Promise<void> {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (output.length >= MAX_FILES) throw new Error("Too many files to compare selectively.");
      if (entry.isSymbolicLink()) throw new Error(`Nested link cannot be synced selectively: ${entry.name}`);
      if (entry.name === ".git" || entry.name.startsWith(".obsidian-symlink-manager-")) continue;
      const relative = prefix ? path.join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) await walk(path.join(current, entry.name), relative);
      else if (entry.isFile()) output.push(relative);
      else throw new Error(`Unsupported file type: ${relative}`);
    }
  }
  await walk(root, "");
  return output;
}

function jsonChanges(relativePath: string, fileName: string, left: Buffer, right: Buffer): SelectiveChange[] | null {
  if (!fileName.endsWith(".json")) return null;
  let a: unknown;
  let b: unknown;
  try {
    a = JSON.parse(left.toString("utf8"));
    b = JSON.parse(right.toString("utf8"));
  } catch {
    return null;
  }
  const leftHash = hash(left);
  const rightHash = hash(right);
  if (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.every((entry) => typeof entry === "string") &&
    b.every((entry) => typeof entry === "string") &&
    new Set(a).size === a.length &&
    new Set(b).size === b.length
  ) {
    const changes = [...new Set([...a, ...b])]
      .filter((entry) => a.includes(entry) !== b.includes(entry))
      .sort()
      .map((entry) =>
        record(
          "array-entry",
          relativePath,
          entry,
          a.includes(entry) ? "Enabled" : "Disabled",
          b.includes(entry) ? "Enabled" : "Disabled",
          leftHash,
          rightHash,
          undefined,
          entry,
        ),
      );
    return changes.length ? changes : null;
  }
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const changes = [...new Set([...Object.keys(left), ...Object.keys(right)])]
      .filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]))
      .sort()
      .map((key) =>
        record(
          "json-key",
          relativePath,
          key,
          preview(left[key], Object.hasOwn(left, key)),
          preview(right[key], Object.hasOwn(right, key)),
          leftHash,
          rightHash,
          key,
        ),
      );
    return changes.length ? changes : null;
  }
  return null;
}

export async function loadSelectiveChanges(item: VaultItem): Promise<SelectiveChange[]> {
  const { defaultPath, targetPath } = await checkedIndependentItem(item);
  const paths =
    item.category === "plugins" || item.category === "themes"
      ? [...new Set([...(await collectFiles(defaultPath)), ...(await collectFiles(targetPath))])].sort()
      : [""];
  if (paths.length > MAX_FILES) throw new Error("Too many files to compare selectively.");
  const all = await Promise.all(
    paths.map(async (relativePath) => {
      const [a, b] = await Promise.all([
        physicalFile(path.join(defaultPath, relativePath)),
        physicalFile(path.join(targetPath, relativePath)),
      ]);
      if (hash(a) === hash(b)) return [];
      const semantic = a && b ? jsonChanges(relativePath, relativePath || item.name, a, b) : null;
      if (semantic !== null) return semantic;
      const label = relativePath || item.name;
      return [
        record(
          "file",
          relativePath,
          label,
          a ? `${a.length} bytes` : "Absent",
          b ? `${b.length} bytes` : "Absent",
          hash(a),
          hash(b),
        ),
      ];
    }),
  );
  return all.flat();
}

async function checkedFilePath(root: string, relativePath: string, createParents = false): Promise<string> {
  if (path.isAbsolute(relativePath)) throw new Error("Invalid selected file path.");
  const parts = relativePath ? relativePath.split(path.sep) : [];
  if (parts.some((part) => !part || part === "." || part === "..")) throw new Error("Invalid selected file path.");
  let parent = root;
  for (const part of parts.slice(0, -1)) {
    parent = path.join(parent, part);
    let stat: Awaited<ReturnType<typeof fs.lstat>>;
    try {
      stat = await fs.lstat(parent);
    } catch (error) {
      if (!createParents || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await fs.mkdir(parent);
      stat = await fs.lstat(parent);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error("A selected file parent is not a physical directory.");
  }
  return path.join(root, ...parts);
}

function amendedJson(destination: Buffer, source: Buffer, change: SelectiveChange): Buffer {
  const target = JSON.parse(destination.toString("utf8")) as unknown;
  const origin = JSON.parse(source.toString("utf8")) as unknown;
  if (change.kind === "json-key") {
    if (
      !target ||
      !origin ||
      typeof target !== "object" ||
      typeof origin !== "object" ||
      Array.isArray(target) ||
      Array.isArray(origin) ||
      change.key === undefined
    )
      throw new Error("The JSON structure changed.");
    const to = target as Record<string, unknown>;
    const from = origin as Record<string, unknown>;
    if (Object.hasOwn(from, change.key)) to[change.key] = from[change.key];
    else delete to[change.key];
  } else if (change.kind === "array-entry") {
    if (!Array.isArray(target) || !Array.isArray(origin) || change.entry === undefined)
      throw new Error("The JSON array changed.");
    const at = target.indexOf(change.entry);
    if (origin.includes(change.entry) && at < 0) target.push(change.entry);
    if (!origin.includes(change.entry) && at >= 0) target.splice(at, 1);
  }
  const original = destination.toString("utf8");
  const indent = original.match(/\n([ \t]+)\S/)?.[1] ?? "  ";
  const newline = original.endsWith("\n") ? "\n" : "";
  return Buffer.from(JSON.stringify(target, null, indent) + newline);
}

/** Copy exactly one selected setting or file. Existing destination gets a retained sibling backup. */
export async function applySelectiveChange(
  item: VaultItem,
  change: SelectiveChange,
  from: Side,
): Promise<SelectiveSyncResult> {
  const locations = await checkedIndependentItem(item);
  const current = (await loadSelectiveChanges(item)).find((candidate) => candidate.id === change.id);
  if (!current || current.defaultHash !== change.defaultHash || current.targetHash !== change.targetHash)
    throw new Error("The copies changed since this comparison. Refresh and review the difference again.");
  const sourceRoot = from === "default" ? locations.defaultPath : locations.targetPath;
  const destinationRoot = from === "default" ? locations.targetPath : locations.defaultPath;
  const sourcePath = await checkedFilePath(sourceRoot, change.relativePath);
  const destinationPath = await checkedFilePath(destinationRoot, change.relativePath, true);
  const [source, destination] = await Promise.all([physicalFile(sourcePath), physicalFile(destinationPath)]);
  if (hash(source) !== (from === "default" ? change.defaultHash : change.targetHash))
    throw new Error("The source changed. Refresh the comparison.");
  if (hash(destination) !== (from === "default" ? change.targetHash : change.defaultHash))
    throw new Error("The destination changed. Refresh the comparison.");
  if (!source) throw new Error("The selected source file is absent; selective deletion is unavailable.");
  if (change.kind !== "file" && !destination) throw new Error("A JSON setting requires both physical files.");
  const next = change.kind === "file" ? source : amendedJson(destination!, source, change);
  const relativeItem = path.relative(path.join(item.defaultVault, ".obsidian"), locations.defaultPath);
  if (from === "target")
    await commitItem(item.defaultVault, relativeItem, `Snapshot ${relativeItem} before selective sync`);
  const temp = destinationPath + `.obsidian-symlink-manager-${randomUUID()}.tmp`;
  const backupFolder = path.join(environment.supportPath, "selective-backups");
  const backup = destination ? path.join(backupFolder, `${Date.now()}-${randomUUID()}.backup`) : null;
  if (backup) {
    await fs.mkdir(backupFolder, { recursive: true });
    await fs.copyFile(destinationPath, backup, fs.constants.COPYFILE_EXCL);
  }
  await fs.writeFile(temp, next, {
    flag: "wx",
    mode: destination ? (await fs.lstat(destinationPath)).mode : undefined,
  });
  try {
    if (destination) {
      const currentDestination = await physicalFile(destinationPath).catch(() => null);
      if (
        currentDestination &&
        hash(currentDestination) !== (from === "default" ? change.targetHash : change.defaultHash)
      ) {
        throw new Error("The destination was modified while preparing the change. Refresh and try again.");
      }
    }
    await fs.rename(temp, destinationPath);
  } catch (error) {
    await fs.rm(temp, { force: true });
    throw error;
  }
  const saved = await physicalFile(destinationPath);
  if (hash(saved) !== hash(next)) {
    throw new Error(`The change was written to ${destinationPath}, but the file changed before it could be verified.`);
  }
  if (from === "target") {
    try {
      await commitItem(
        item.defaultVault,
        relativeItem,
        `Synced ${change.label} from ${path.basename(item.targetVault)}`,
      );
    } catch (error) {
      return { backup, historyWarning: `The change was saved, but Git could not record it: ${String(error)}` };
    }
  }
  return { backup };
}
