import { environment, getPreferenceValues } from "@raycast/api";
import { chmodSync, existsSync } from "fs";
import { execFile } from "child_process";
import { join } from "path";

let chmodApplied = false;

export function getFindrPath(): string {
  const { findrPath } = getPreferenceValues<ExtensionPreferences>();

  // User override takes priority
  if (findrPath && existsSync(findrPath)) {
    return findrPath;
  }

  // Bundled universal binary (arm64 + x86_64), built via GitHub Actions CI:
  // Source: https://github.com/Roderick111/findr (MIT license, fully auditable)
  // CI workflow: .github/workflows/ci.yml — builds on tag push, attaches to GitHub Release
  const bundled = join(environment.assetsPath, "findr");
  if (existsSync(bundled)) {
    if (!chmodApplied) {
      try {
        chmodSync(bundled, 0o755);
      } catch {
        // May already be executable
      }
      chmodApplied = true;
    }
    return bundled;
  }

  return bundled;
}

export function getMaxResults(): number {
  const { maxResults } = getPreferenceValues<ExtensionPreferences>();
  const parsed = parseInt(maxResults, 10);
  return parsed > 0 ? parsed : 30;
}

export function getOpenRouterApiKey(): string {
  const { openrouterApiKey } = getPreferenceValues<ExtensionPreferences>();
  return openrouterApiKey?.trim() || "";
}

export function getScanScope(): string {
  const { scanScope } = getPreferenceValues<ExtensionPreferences>();
  return scanScope || "personal";
}

export function getCustomPaths(): string {
  const { customPaths } = getPreferenceValues<ExtensionPreferences>();
  return customPaths?.trim() || "";
}

export function getScanArgs(): string[] {
  const scope = getScanScope();
  const custom = getCustomPaths();
  const args = ["--preset", scope];
  if (custom) {
    args.push("--paths", custom);
  }
  return args;
}

export function getFindrEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const key = getOpenRouterApiKey();
  if (key) {
    env.OPENROUTER_API_KEY = key;
  }
  return env;
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatRelativeDate(isoDate: string): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const time = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diffDays === 0) return `Today at ${time}`;
  if (diffDays === 1) return `Yesterday at ${time}`;
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${day} ${month}, ${year} at ${time}`;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: "📄",
  doc: "📝",
  docx: "📝",
  xls: "📊",
  xlsx: "📊",
  ppt: "📊",
  pptx: "📊",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  gif: "🖼️",
  svg: "🖼️",
  webp: "🖼️",
  mp3: "🎵",
  mp4: "🎬",
  mov: "🎬",
  zip: "📦",
  tar: "📦",
  gz: "📦",
  md: "📋",
  txt: "📋",
  csv: "📋",
  json: "⚙️",
  yml: "⚙️",
  yaml: "⚙️",
  toml: "⚙️",
  rs: "🦀",
  ts: "💠",
  tsx: "💠",
  js: "💛",
  jsx: "💛",
  py: "🐍",
  go: "🐹",
  html: "🌐",
  css: "🎨",
  sh: "⚡",
};

export function getFileIcon(ext: string | null): string {
  if (!ext) return "📁";
  return FILE_TYPE_ICONS[ext] || "📁";
}

/** Fire-and-forget interaction tracking for frequency-based ranking. */
export function trackInteraction(path: string, action: string): void {
  execFile(getFindrPath(), ["track", path, "--action", action], () => {});
}
