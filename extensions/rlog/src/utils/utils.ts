import fs from "fs";
import os from "os";
import path from "path";

export interface ReadingEntry {
  url: string;
  title: string;
  author: string | null;
  publishedDate: string | null;
  addedDate: string;
  thoughts?: string;
  rating?: number;
}

export interface ReadLaterEntry {
  url: string;
  title: string;
  addedAt: string;
}

/**
 * Validate that a blog path preference is set before any git/blog operation.
 * blogPath is an optional extension preference so that capture-only usage needs
 * zero setup; commands that actually touch the blog repo must guard at runtime.
 */
export function requireBlogPath(blogPath: string | undefined): string {
  if (!blogPath || !blogPath.trim()) {
    throw new Error(
      "Set your Blog Repository Path in rlog preferences to use this command.",
    );
  }
  return blogPath;
}

/** Expand a leading ~ to the user's home directory. */
export function expandTilde(filePath: string): string {
  if (filePath === "~") return os.homedir();
  if (filePath.startsWith("~/"))
    return path.join(os.homedir(), filePath.slice(2));
  return filePath;
}

/** Normalise a URL for dedup comparison (mirrors api dedup: strip trailing slashes). */
export function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function loadJson<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.trim() ? JSON.parse(content) : [];
  } catch (error) {
    console.error(`Failed to load JSON from ${filePath}:`, error);
    return [];
  }
}
