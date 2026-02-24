import { existsSync, statSync } from "fs";
import path from "path";
import type { Exchange } from "./types.js";

/**
 * Decode an encoded project path back to real filesystem path.
 * Claude Code encodes `/` and `.` as `-`, so the decoder walks
 * the filesystem to resolve ambiguity with directory names that
 * contain literal dashes (e.g. `schools-app`).
 *
 * `-Users-shubham-Desktop-foo`              → `/Users/shubham/Desktop/foo`
 * `-...-frontend-app-schools-app`           → `/.../frontend/app/schools-app`
 * `-...-outfii--claude-worktrees-pay-bill`  → `/.../outfii/.claude/worktrees/pay-bill`
 */
export function decodeProjectPath(encoded: string): string {
  const clean = encoded.replace(/\/$/, "");
  const segments = clean.replace(/^-/, "").split("-");

  let currentPath = "/";
  let component = "";
  let dotPrefix = false;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // Empty segment from `--` means next name is dot-prefixed (e.g. .claude)
    if (!seg) {
      dotPrefix = true;
      continue;
    }

    const name = dotPrefix ? "." + seg : seg;
    dotPrefix = false;

    component = component ? component + "-" + name : name;

    // Check if this completes a valid directory on disk
    const candidate = path.join(currentPath, component);
    try {
      if (existsSync(candidate) && statSync(candidate).isDirectory()) {
        currentPath = candidate;
        component = "";
      }
    } catch {
      // Not a valid directory, keep accumulating with dashes
    }
  }

  // Append remaining component (final leaf of the path)
  if (component) {
    currentPath = path.join(currentPath, component);
  }

  return currentPath;
}

/**
 * Get a short display name from a decoded project path.
 * `/Users/shubham/Desktop/Personal/foo` → `foo`
 */
export function projectDisplayName(decodedPath: string): string {
  return path.basename(decodedPath) || decodedPath;
}

/**
 * Truncate a string to maxLen, adding ellipsis if needed.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

/**
 * Format a date as relative time (e.g., "2h ago", "3d ago").
 */
export function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  return `${months}mo ago`;
}

/**
 * Format exchanges as markdown for the detail panel.
 */
export function exchangesToMarkdown(exchanges: Exchange[]): string {
  const parts: string[] = [];

  for (const ex of exchanges) {
    if (ex.role === "user") {
      parts.push(`> ${ex.text}`);
    } else {
      let header = "### 🤖 Assistant";
      if (ex.model) {
        header += ` *(${formatModelName(ex.model)})*`;
      }
      parts.push(`${header}\n\n${ex.text}`);
      if (ex.toolNames && ex.toolNames.length > 0) {
        parts.push(`\n*Tools used: ${ex.toolNames.join(", ")}*`);
      }
    }
  }

  return parts.join("\n\n---\n\n");
}

function formatModelName(model: string): string {
  if (model.includes("opus")) return "Opus";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("haiku")) return "Haiku";
  return model;
}

/**
 * Shorten a project path for display, collapsing home dir.
 */
export function shortenPath(fullPath: string): string {
  const home = process.env.HOME || "";
  if (home && fullPath.startsWith(home)) {
    return "~" + fullPath.slice(home.length);
  }
  return fullPath;
}
