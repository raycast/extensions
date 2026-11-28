import fs from "node:fs";
import path from "node:path";
import { LOG_PREFIX } from "@/core/log";
import { isPlistDict, readPlistFile, type PlistValue } from "./bplist";
import type { DawAdapter, DawSet, ProjectFileMetadata } from "@/daws/types";

/** Logic 的项目包后缀。 */
export const PACKAGE_EXTENSION = ".logicx";

const PACKAGE_EXTENSION_PATTERN = /\.logicx$/i;
// Alternatives/000、001……：文件夹名的数字就是 ProjectInformation.plist 里 Alternative 的编号。
const ALTERNATIVE_INDEX_PATTERN = /^\d+$/;
export const PROJECT_NAME_TOKEN = "{PROJECT_NAME}";

// Logic 只用升号存根音（选 A♭ 小调，存的是 "G#"），统一成 Ableton 的写法；降号写法也认，以防别的版本这样存。
const ROOT_NOTES: Record<string, string> = {
  C: "C",
  "C#": "C♯/D♭",
  Db: "C♯/D♭",
  D: "D",
  "D#": "E♭",
  Eb: "E♭",
  E: "E",
  F: "F",
  "F#": "F♯/G♭",
  Gb: "F♯/G♭",
  G: "G",
  "G#": "A♭",
  Ab: "A♭",
  A: "A",
  "A#": "B♭",
  Bb: "B♭",
  B: "B",
};

const SCALE_NAMES: Record<string, string> = { major: "Major", minor: "Minor" };

function emptyMetadata(): ProjectFileMetadata {
  return { bpm: null, timeSignature: null, key: null };
}

function idForEntry(entryName: string): string {
  return entryName.replace(PACKAGE_EXTENSION_PATTERN, "");
}

function isDirectory(entryPath: string): boolean {
  try {
    return fs.statSync(entryPath).isDirectory();
  } catch {
    return false;
  }
}

/** 文件夹里所有 .logicx 包的完整路径，按名字排序。改名只改外层文件夹，包名不跟着变，所以按后缀找，不按名字拼。 */
export function listPackages(folderPath: string): string[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(folderPath);
  } catch {
    return [];
  }
  return entries
    .filter((entry) => PACKAGE_EXTENSION_PATTERN.test(entry) && isDirectory(path.join(folderPath, entry)))
    .sort()
    .map((entry) => path.join(folderPath, entry));
}

/** 包最后一次保存的时间：各 Alternative 里 ProjectData 修改时间的最大值。一个都读不到时为 -Infinity。 */
export function lastSavedAt(packagePath: string): number {
  const alternativesPath = path.join(packagePath, "Alternatives");
  let entries: string[];
  try {
    entries = fs.readdirSync(alternativesPath);
  } catch {
    return Number.NEGATIVE_INFINITY;
  }
  let latest = Number.NEGATIVE_INFINITY;
  for (const entry of entries) {
    if (!ALTERNATIVE_INDEX_PATTERN.test(entry)) continue;
    try {
      latest = Math.max(latest, fs.statSync(path.join(alternativesPath, entry, "ProjectData")).mtimeMs);
    } catch {
      continue;
    }
  }
  return latest;
}

// 文件夹形态的主包。用 Save As 做版本时，Logic 默认存进同一个文件夹，所以一个文件夹里常有好几个包。
// 取最后保存的那个（用户正在做的版本）；保存时间一样时优先和文件夹同名的，再按名字。
export function findPackage(folderPath: string): string | null {
  const folderName = path.basename(folderPath);
  const ranked = listPackages(folderPath)
    .map((packagePath) => ({
      packagePath,
      savedAt: lastSavedAt(packagePath),
      sameName: idForEntry(path.basename(packagePath)) === folderName,
    }))
    .sort((a, b) => b.savedAt - a.savedAt || Number(b.sameName) - Number(a.sameName));
  return ranked[0]?.packagePath ?? null;
}

type ProjectInformation = { names: Map<number, string>; active: number | null };

// Alternative 的显示名和当前打开的是哪个，都在 Resources/ProjectInformation.plist。读不到时返回空，名字退回编号文件夹名。
function readProjectInformation(packagePath: string): ProjectInformation {
  const names = new Map<number, string>();
  let info: PlistValue;
  try {
    info = readPlistFile(path.join(packagePath, "Resources", "ProjectInformation.plist"));
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to read Logic project information: ${packagePath}`, error);
    return { names, active: null };
  }
  if (!isPlistDict(info)) return { names, active: null };

  // VariantNamesV2 在后，覆盖 VariantNames：它用 {PROJECT_NAME} 占位，名字跟着项目改名走。
  const projectName = idForEntry(path.basename(packagePath));
  for (const field of ["VariantNames", "VariantNamesV2"]) {
    const variants = info[field];
    if (!isPlistDict(variants)) continue;
    for (const [key, name] of Object.entries(variants)) {
      if (!ALTERNATIVE_INDEX_PATTERN.test(key) || typeof name !== "string") continue;
      names.set(Number(key), name.replaceAll(PROJECT_NAME_TOKEN, projectName));
    }
  }

  const active = typeof info.ActiveVariant === "number" ? info.ActiveVariant : null;
  return { names, active };
}

function parseBpm(value: PlistValue | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  // 万一存成单精度浮点（120.3 会读成 120.30000305），按 Logic 速度最多 4 位小数取整。
  return Math.round(value * 10000) / 10000;
}

function isPositiveInteger(value: PlistValue | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parseTimeSignature(numerator: PlistValue | undefined, denominator: PlistValue | undefined): string | null {
  return isPositiveInteger(numerator) && isPositiveInteger(denominator) ? `${numerator}/${denominator}` : null;
}

function parseKey(root: PlistValue | undefined, scale: PlistValue | undefined): string | null {
  if (typeof root !== "string" || typeof scale !== "string" || scale.trim() === "") return null;
  const rootKey = root.trim().replace("♯", "#").replace("♭", "b");
  if (!Object.hasOwn(ROOT_NOTES, rootKey)) return null;
  const scaleKey = scale.trim().toLowerCase();
  // 只见过 major / minor；别的原样显示、首字母大写，不丢掉。
  const scaleName = Object.hasOwn(SCALE_NAMES, scaleKey)
    ? SCALE_NAMES[scaleKey]
    : scale.trim().charAt(0).toUpperCase() + scale.trim().slice(1);
  return `${ROOT_NOTES[rootKey]} ${scaleName}`;
}

/**
 * Logic Pro 适配器：项目是一个 .logicx 包（Package），或一个装着 .logicx 包的文件夹（Folder）。
 * 包里 Alternatives/NNN 是一个 Set，元数据来自其中的 MetaData.plist（二进制 plist）。
 */
export const logicAdapter: DawAdapter = {
  id: "logic",
  appNameMatch: "logic pro",
  readmeUrl: "https://github.com/iyekChen/logic-project-manager#readme",

  // 包名去掉 .logicx 就是 id；文件夹形态的项目直接用文件夹名。
  projectIdForEntry: idForEntry,
  entryNameFor: (title, kind) => (kind === "package" ? `${title}${PACKAGE_EXTENSION}` : title),

  detectProject(entryPath, entryName) {
    if (!isDirectory(entryPath)) return null;
    if (PACKAGE_EXTENSION_PATTERN.test(entryName)) {
      return { id: idForEntry(entryName), folderPath: entryPath, kind: "package" };
    }
    return listPackages(entryPath).length > 0 ? { id: entryName, folderPath: entryPath, kind: "folder" } : null;
  },

  // 文件夹形态的项目里可以有多个 .logicx（Save As 存出来的版本）；Package 形态没有这一层，返回 null。
  countProjectFiles({ folderPath, kind }) {
    return kind === "folder" ? listPackages(folderPath).length : null;
  },

  listSets({ folderPath, kind }) {
    const packagePath = kind === "package" ? folderPath : findPackage(folderPath);
    if (!packagePath) return [];

    const alternativesPath = path.join(packagePath, "Alternatives");
    let entries: string[];
    try {
      entries = fs.readdirSync(alternativesPath);
    } catch {
      return [];
    }

    const { names, active } = readProjectInformation(packagePath);
    const sets: DawSet[] = [];
    for (const entry of entries) {
      // 只认编号文件夹（跳过 .DS_Store 等），也只读这一层，不进 Project File Backups 里的备份。
      if (!ALTERNATIVE_INDEX_PATTERN.test(entry)) continue;
      const index = Number(entry);
      const alternativePath = path.join(alternativesPath, entry);
      const metadataFile = path.join(alternativePath, "MetaData.plist");
      try {
        if (!fs.statSync(metadataFile).isFile()) continue;
        // 修改时间看 ProjectData（工程本体）。创建时间看编号文件夹：Logic 每次保存都会重新生成 ProjectData，它的创建时间等于最后保存时间。
        const stats = fs.statSync(path.join(alternativePath, "ProjectData"));
        const folderStats = fs.statSync(alternativePath);
        sets.push({
          name: names.get(index) ?? entry,
          // Logic 只能整个包打开（打开的是当前 Active 的 Alternative），所以都指向包。
          path: packagePath,
          metadataFile,
          createdAt: folderStats.birthtimeMs,
          modifiedAt: stats.mtimeMs,
          active: index === active,
        });
      } catch {
        continue;
      }
    }
    // 只有一个 Alternative 时 Logic 只能打开它，直接算 Active（老工程可能没有 ActiveVariant，或者它对不上）。
    if (sets.length === 1) sets[0].active = true;
    return sets;
  },

  async parseSet(set) {
    try {
      const metadata = readPlistFile(set.metadataFile);
      if (!isPlistDict(metadata)) return emptyMetadata();
      return {
        bpm: parseBpm(metadata.BeatsPerMinute),
        timeSignature: parseTimeSignature(metadata.SongSignatureNumerator, metadata.SongSignatureDenominator),
        key: parseKey(metadata.SongKey, metadata.SongGenderKey),
      };
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to parse Logic metadata: ${set.metadataFile}`, error);
      return emptyMetadata();
    }
  },
};
