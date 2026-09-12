import type { ClipboardManagerItem } from "bettertouchtool";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, isAbsolute, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const defaultPreviewLength = 120;
const hexColorPattern = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
const shellCommandExecutables = new Set([
  "apt",
  "apt-get",
  "asdf",
  "bash",
  "brew",
  "bundle",
  "bundler",
  "bun",
  "cargo",
  "cd",
  "cmake",
  "composer",
  "corepack",
  "curl",
  "deno",
  "dnf",
  "docker",
  "docker-compose",
  "flatpak",
  "gem",
  "gh",
  "git",
  "go",
  "helm",
  "jq",
  "kubectl",
  "make",
  "mise",
  "node",
  "npm",
  "npx",
  "nvm",
  "pacman",
  "pip",
  "pip3",
  "pnpm",
  "python",
  "python3",
  "rg",
  "rsync",
  "rustc",
  "scp",
  "sdk",
  "sh",
  "snap",
  "ssh",
  "terraform",
  "uv",
  "volta",
  "wget",
  "xcode-select",
  "yarn",
  "yum",
  "zsh",
]);

export function getClipboardItemText(item: ClipboardManagerItem): string {
  if (typeof item.content === "string" && item.content.length > 0) return item.content;
  return "";
}

export function getClipboardItemTitle(item: ClipboardManagerItem, maxLength = defaultPreviewLength): string {
  const preview = (item.meta.previewText || getClipboardItemText(item)).replace(/\s+/g, " ").trim();
  if (!preview) return "Non-text clipboard item";
  return preview.length <= maxLength ? preview : `${preview.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function getClipboardItemUrl(item: ClipboardManagerItem): string | undefined {
  const text = getClipboardItemText(item).trim();
  if (!text) return undefined;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function getClipboardItemColor(item: ClipboardManagerItem): string | undefined {
  const text = getClipboardItemText(item).trim();
  return hexColorPattern.test(text) ? text : undefined;
}

export function getClipboardItemFilePath(item: ClipboardManagerItem): string | undefined {
  let text = getClipboardItemText(item).trim();
  if (!text || /[\r\n]/.test(text)) return undefined;

  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1);
  }

  let filePath: string;
  try {
    if (text.startsWith("file://")) {
      filePath = fileURLToPath(text);
    } else if (text === "~") {
      filePath = homedir();
    } else if (text.startsWith("~/")) {
      filePath = join(homedir(), text.slice(2));
    } else if (isAbsolute(text)) {
      filePath = normalize(text);
    } else {
      return undefined;
    }

    return existsSync(filePath) ? filePath : undefined;
  } catch {
    return undefined;
  }
}

export function parseClipboardCommandWhitelist(value: string | undefined): ReadonlySet<string> {
  const executables = new Set<string>();
  for (const entry of value?.split(/[,\n]+/) ?? []) {
    const executable = entry.trim().toLowerCase();
    if (/^[a-z\d][\w+.-]*$/i.test(executable)) executables.add(executable);
  }
  return executables;
}

export function getClipboardItemShellCommand(
  item: ClipboardManagerItem,
  customExecutables: ReadonlySet<string> = new Set(),
): string | undefined {
  let text = getClipboardItemText(item).trim();
  if (!text || text.length > 2_000 || /[\r\n]/.test(text)) return undefined;

  text = text.replace(/^(?:\$|%|>|❯|➜)\s+/, "");
  const executable = getShellExecutable(text);
  return executable && (shellCommandExecutables.has(executable) || customExecutables.has(executable))
    ? text
    : undefined;
}

function getShellExecutable(command: string): string | undefined {
  let remainder = command;
  let executable = shiftShellToken();

  if (executable === "sudo") {
    while (remainder.startsWith("-")) shiftShellToken();
    executable = shiftShellToken();
  }

  if (executable === "env") {
    while (/^[A-Za-z_][A-Za-z\d_]*=\S+/.test(remainder)) shiftShellToken();
    executable = shiftShellToken();
  }

  return executable;

  function shiftShellToken(): string | undefined {
    const match = remainder.match(/^(\S+)(?:\s+|$)/);
    if (!match) return undefined;
    remainder = remainder.slice(match[0].length);
    return basename(match[1]).toLowerCase();
  }
}

export function formatClipboardItemDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
