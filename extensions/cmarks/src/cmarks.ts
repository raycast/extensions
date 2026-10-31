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
const CONTAINER_PREFS = path.join(
  homedir(),
  "Library/Containers",
  BUNDLE_ID,
  "Data/Library/Preferences",
  `${BUNDLE_ID}.plist`,
);

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
const MAX_FILES = 8000;
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
async function readPref<T>(key: string, source: "defaults" | "container"): Promise<T | undefined> {
  try {
    const { stdout } =
      source === "defaults"
        ? await run("sh", ["-c", `defaults export ${BUNDLE_ID} - | plutil -extract ${key} json -o - -`])
        : await run("plutil", ["-extract", key, "json", "-o", "-", CONTAINER_PREFS]);
    return JSON.parse(stdout) as T;
  } catch {
    return undefined; // 키가 없거나(기본값 사용) 파일이 없다(App Store 판 미설치)
  }
}

/** 공백·쉼표로 나뉜 설정 문자열. 확장자는 앞의 점을 떼고 소문자로, 폴더 이름은 cmarks와 같이 그대로(대소문자·점 유지) 비교한다. */
function splitList(value: string | undefined, fallback: string[], kind: "extensions" | "folders"): Set<string> {
  if (!value || !value.trim()) return new Set(fallback);
  const items = value
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set(kind === "extensions" ? items.map((s) => s.replace(/^\./, "").toLowerCase()) : items);
}

export interface Filter {
  extensions: Set<string>;
  ignored: Set<string>;
}

export async function loadFilter(): Promise<Filter> {
  const [extensions, ignored] = await Promise.all([
    readPref<string>("markdownExtensions", "defaults"),
    readPref<string>("ignoredDirectories", "defaults"),
  ]);
  return {
    extensions: splitList(extensions, DEFAULT_EXTENSIONS, "extensions"),
    ignored: splitList(ignored, DEFAULT_IGNORED, "folders"),
  };
}

/** 워크스페이스 폴더의 마크다운 파일을 모두 모은다(숨김 폴더·무시 폴더 제외, 심볼릭 링크는 따라가지 않음). */
export async function listMarkdownFiles(workspaces: Workspace[], filter: Filter): Promise<MarkdownFile[]> {
  const files: MarkdownFile[] = [];
  for (const workspace of workspaces) {
    await walk(workspace.root, 0);
    if (files.length >= MAX_FILES) break;

    async function walk(dir: string, depth: number) {
      if (depth > MAX_DEPTH || files.length >= MAX_FILES) return;
      let entries: Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (filter.ignored.has(entry.name)) continue; // cmarks와 같이 이름 그대로 비교
          await walk(full, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).slice(1).toLowerCase();
          if (!filter.extensions.has(ext)) continue;
          files.push({
            path: full,
            name: entry.name,
            relativeDir: path.relative(workspace.root, dir),
            workspace,
          });
          if (files.length >= MAX_FILES) return;
        }
      }
    }
  }
  return files;
}

/** 최근 파일(앞이 최근). 두 판의 목록을 합치고 없는 파일은 뺀다. */
export async function loadRecentFiles(): Promise<string[]> {
  const [github, appstore] = await Promise.all([
    readPref<string[]>("recentFiles", "defaults"),
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
