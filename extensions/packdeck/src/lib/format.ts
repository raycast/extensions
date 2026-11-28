import os from "node:os";

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "0";
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString("en-US");
}

export function formatBytes(bytes: number | undefined | null): string {
  if (bytes === undefined || bytes === null || bytes < 0) {
    return "Unknown";
  }
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / 1024 ** idx;
  return `${val >= 10 || idx === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}

export function formatRelativeTime(input: string | number | Date | undefined): string {
  if (!input) return "Unknown";
  const date = input instanceof Date ? input : new Date(input);
  const time = date.getTime();
  if (Number.isNaN(time)) return "Unknown";

  const diffMs = Date.now() - time;
  const absSec = Math.floor(Math.abs(diffMs) / 1000);
  const suffix = diffMs >= 0 ? "ago" : "from now";

  if (absSec < 60) return "just now";
  const mins = Math.floor(absSec / 60);
  if (mins < 60) return `${mins}m ${suffix}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${suffix}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ${suffix}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ${suffix}`;
  const years = Math.floor(months / 12);
  return `${years}y ${suffix}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const remSec = Math.round(seconds % 60);
  return `${mins}m ${remSec}s`;
}

export function formatScorePercent(score: number | undefined): string {
  if (score === undefined || Number.isNaN(score)) return "—";
  return `${Math.round(Math.max(0, Math.min(1, score)) * 100)}%`;
}

export function formatPathForDisplay(fullPath: string): string {
  const home = os.homedir();
  if (fullPath === home) return "~";
  if (fullPath.startsWith(`${home}/`)) {
    return `~/${fullPath.slice(home.length + 1)}`;
  }
  return fullPath;
}

export function expandTilde(inputPath: string): string {
  const trimmed = inputPath.trim();
  if (trimmed === "~") return os.homedir();
  if (trimmed.startsWith("~/")) {
    return `${os.homedir()}/${trimmed.slice(2)}`;
  }
  return trimmed;
}

export function normalizeRepositoryUrl(
  repo?: string | { type?: string; url?: string; directory?: string },
): string | undefined {
  const raw = typeof repo === "string" ? repo : repo?.url;
  if (!raw) return undefined;

  let cleaned = raw.trim();
  if (cleaned.startsWith("github:")) {
    cleaned = `https://github.com/${cleaned.slice("github:".length)}`;
  } else if (cleaned.startsWith("gitlab:")) {
    cleaned = `https://gitlab.com/${cleaned.slice("gitlab:".length)}`;
  } else if (cleaned.startsWith("bitbucket:")) {
    cleaned = `https://bitbucket.org/${cleaned.slice("bitbucket:".length)}`;
  } else if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(cleaned)) {
    cleaned = `https://github.com/${cleaned}`;
  }

  cleaned = cleaned
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^ssh:\/\/git@github\.com\//, "https://github.com/")
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/^ssh:\/\/git@gitlab\.com\//, "https://gitlab.com/")
    .replace(/^git@gitlab\.com:/, "https://gitlab.com/")
    .replace(/\.git$/, "");

  if (!/^https?:\/\//i.test(cleaned)) {
    return undefined;
  }

  return cleaned;
}

export function deriveGitHubLinks(repoUrl?: string): {
  releasesUrl?: string;
  changelogUrl?: string;
  issuesUrl?: string;
} {
  if (!repoUrl) return {};
  const ghMatch = repoUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!ghMatch) return {};
  const base = `https://github.com/${ghMatch[1]}/${ghMatch[2]}`;
  return {
    releasesUrl: `${base}/releases`,
    changelogUrl: `${base}/blob/HEAD/CHANGELOG.md`,
    issuesUrl: `${base}/issues`,
  };
}

export function stripAnsi(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "").replace(/\u001b\][^\u0007]*\u0007/g, "");
}

export function wrapCodeBlock(content: string, lang = ""): string {
  const clean = stripAnsi(content).trim();
  if (!clean) return "_No output._";
  // Use a fence longer than any backtick run inside content
  const maxRun = Math.max(2, ...Array.from(clean.matchAll(/`+/g), (m) => m[0].length));
  const fence = "`".repeat(maxRun + 1);
  return `${fence}${lang}\n${clean}\n${fence}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
