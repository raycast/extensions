import { execFile } from "node:child_process";
import { promises as fs, Dirent } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** cmarks 번들 ID. `open -b`와 같다. GitHub 판과 App Store 판 모두 같은 ID를 쓴다. */
export const BUNDLE_ID = "com.changhyunyoo.cmarks";

/** 세션 파일 위치. GitHub/Homebrew 판은 Application Support, App Store 판은 샌드박스 컨테이너 안. */
const SESSION_PATHS = [
  path.join(homedir(), "Library/Application Support/cmarks/session.json"),
  path.join(homedir(), "Library/Containers", BUNDLE_ID, "Data/Library/Application Support/cmarks/session.json"),
];
/** 설정 파일. GitHub/Homebrew 판은 ~/Library/Preferences, App Store 판은 샌드박스 컨테이너 안.
 *  번들 ID로 `defaults export com.changhyunyoo.cmarks`를 하면 컨테이너가 있는 Mac에서는 cfprefsd가 컨테이너 쪽으로
 *  돌려 읽어 GitHub 판 설정이 보이지 않으므로, 두 판 모두 파일 경로로 읽는다(경로 형식도 cfprefsd를 거쳐 캐시와 일치). */
const PREFS_PATHS = {
  github: path.join(homedir(), "Library/Preferences", `${BUNDLE_ID}.plist`),
  container: path.join(homedir(), "Library/Containers", BUNDLE_ID, "Data/Library/Preferences", `${BUNDLE_ID}.plist`),
};

/** cmarks 기본값과 같다(FileKit FileFilter). 설정에서 바꿨으면 defaults에서 읽은 값으로 덮어쓴다. */
const DEFAULT_EXTENSIONS = ["md", "markdown", "mdown", "mkd", "mkdn", "mdtxt", "mdtext", "mdx", "qmd", "rmd"];
const DEFAULT_IGNORED = [
  ".git",
  "node_modules",
  ".build",
  "DerivedData",
  ".svn",
  ".hg",
  "__pycache__",
  ".venv",
  "Pods",
];
/** 워크스페이스마다 따로 센다. 한 워크스페이스가 커도 다음 워크스페이스가 통째로 빠지지 않도록. */
export const MAX_FILES_PER_WORKSPACE = 5000;
const MAX_DEPTH = 12;

export interface Workspace {
  name: string;
  root: string;
}

export interface MarkdownFile {
  path: string;
  name: string;
  relativeDir: string;
  workspace: Workspace;
}

function fileURLToPath(url: string): string | null {
  if (!url.startsWith("file://")) return null;
  try {
    return decodeURIComponent(new URL(url).pathname).replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** 세션에 저장된 워크스페이스(폴더가 있는 것만). 두 판의 세션을 합치고 같은 폴더는 한 번만. */
export async function loadWorkspaces(): Promise<Workspace[]> {
  const seen = new Set<string>();
  const result: Workspace[] = [];
  for (const sessionPath of SESSION_PATHS) {
    let raw: string;
    try {
      raw = await fs.readFile(sessionPath, "utf8");
    } catch {
      continue;
    }
    try {
      const session = JSON.parse(raw) as { workspaces?: { name?: string; rootURL?: string }[] };
      for (const ws of session.workspaces ?? []) {
        const root = ws.rootURL ? fileURLToPath(ws.rootURL) : null;
        if (!root || seen.has(root)) continue;
        seen.add(root);
        result.push({ name: ws.name ?? path.basename(root), root });
      }
    } catch {
      // 손상된 세션 파일은 건너뛴다
    }
  }
  return result;
}

/** 설정 값 하나를 읽는다. 설정 plist에는 JSON으로 바꿀 수 없는 값(창 프레임 등)이 섞여 있어 키 하나씩 뽑는다. */
async function readPref<T>(key: string, source: keyof typeof PREFS_PATHS): Promise<T | undefined> {
  try {
    const { stdout } = await run("sh", [
      "-c",
      'defaults export "$1" - | plutil -extract "$2" json -o - -',
      "sh",
      PREFS_PATHS[source],
      key,
    ]);
    return JSON.parse(stdout) as T;
  } catch {
    return undefined; // 키가 없거나(기본값 사용) 그 판이 설치된 적 없어 파일이 없다
  }
}

/** 공백·쉼표로 나뉜 설정 문자열. 확장자는 앞의 점을 떼고 소문자로, 폴더 이름은 cmarks와 같이 그대로(대소문자·점 유지) 비교한다. */
function splitList(value: string, kind: "extensions" | "folders"): string[] {
  const items = value
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return kind === "extensions" ? items.map((s) => s.replace(/^\./, "").toLowerCase()) : items;
}

/** 두 판(GitHub 판, App Store 판)의 설정을 합친다. 어느 쪽도 바꾸지 않았으면 기본값. */
function mergeLists(values: (string | undefined)[], fallback: string[], kind: "extensions" | "folders"): Set<string> {
  const custom = values.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  if (custom.length === 0) return new Set(fallback);
  return new Set(custom.flatMap((v) => splitList(v, kind)));
}

export interface Filter {
  extensions: Set<string>;
  ignored: Set<string>;
}

/** 설정의 확장자·무시 폴더. 최근 파일과 같이 GitHub 판과 App Store 판의 설정 파일을 모두 읽는다. */
export async function loadFilter(): Promise<Filter> {
  const [extDefaults, extContainer, ignDefaults, ignContainer] = await Promise.all([
    readPref<string>("markdownExtensions", "github"),
    readPref<string>("markdownExtensions", "container"),
    readPref<string>("ignoredDirectories", "github"),
    readPref<string>("ignoredDirectories", "container"),
  ]);
  return {
    extensions: mergeLists([extDefaults, extContainer], DEFAULT_EXTENSIONS, "extensions"),
    ignored: mergeLists([ignDefaults, ignContainer], DEFAULT_IGNORED, "folders"),
  };
}

export interface ScanResult {
  files: MarkdownFile[];
  /** 파일 수·깊이 한도에 걸려 일부만 모은 워크스페이스의 root */
  truncated: Set<string>;
  /** 최상위 폴더 자체를 읽지 못한 워크스페이스(권한 없음·폴더 사라짐). 목록에서 빈 것처럼 보이지 않게 따로 알린다. */
  unreadableRoots: Workspace[];
  /** 읽지 못해 건너뛴 하위 폴더 수 */
  skippedFolders: number;
}

/** 워크스페이스 폴더의 마크다운 파일을 모두 모은다(숨김 폴더·무시 폴더 제외, 심볼릭 링크는 따라가지 않음).
 *  한도에 걸리거나 읽지 못한 폴더는 조용히 넘기지 않고 결과에 표시한다. */
export async function listMarkdownFiles(workspaces: Workspace[], filter: Filter): Promise<ScanResult> {
  const result: ScanResult = { files: [], truncated: new Set(), unreadableRoots: [], skippedFolders: 0 };
  for (const workspace of workspaces) {
    let count = 0;
    const rootEntries = await readDir(workspace.root);
    if (rootEntries === null) {
      result.unreadableRoots.push(workspace);
      continue;
    }
    await walk(workspace.root, rootEntries, 0);

    async function walk(dir: string, entries: Dirent[], depth: number) {
      for (const entry of entries) {
        if (count >= MAX_FILES_PER_WORKSPACE) {
          result.truncated.add(workspace.root);
          return;
        }
        if (entry.name.startsWith(".")) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (filter.ignored.has(entry.name)) continue; // cmarks와 같이 이름 그대로 비교
          if (depth + 1 > MAX_DEPTH) {
            result.truncated.add(workspace.root);
            continue;
          }
          const children = await readDir(full);
          if (children === null) {
            result.skippedFolders += 1;
            continue;
          }
          await walk(full, children, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).slice(1).toLowerCase();
          if (!filter.extensions.has(ext)) continue;
          result.files.push({
            path: full,
            name: entry.name,
            relativeDir: path.relative(workspace.root, dir),
            workspace,
          });
          count += 1;
        }
      }
    }
  }
  return result;
}

/** 폴더 항목을 이름순으로. 읽지 못하면(권한·없음) null. */
async function readDir(dir: string): Promise<Dirent[] | null> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    return entries;
  } catch {
    return null;
  }
}

/** 최근 파일(앞이 최근). 두 판의 목록을 합치고 없는 파일은 뺀다. */
export async function loadRecentFiles(): Promise<string[]> {
  const [github, appstore] = await Promise.all([
    readPref<string[]>("recentFiles", "github"),
    readPref<string[]>("recentFiles", "container"),
  ]);
  const merged: string[] = [];
  for (const p of [...(github ?? []), ...(appstore ?? [])]) {
    if (!merged.includes(p)) merged.push(p);
  }
  const existing = await Promise.all(
    merged.map(async (p) => {
      try {
        await fs.access(p);
        return p;
      } catch {
        return null;
      }
    }),
  );
  return existing.filter((p): p is string => p !== null);
}

export function abbreviateHome(p: string): string {
  const home = homedir();
  return p.startsWith(home) ? "~" + p.slice(home.length) : p;
}
