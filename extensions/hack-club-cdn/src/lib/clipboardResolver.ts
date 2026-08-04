import { Clipboard } from "@raycast/api";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import type { ClipboardResolution } from "./types";

function parseUrl(text: string): URL | undefined {
  try {
    return new URL(text);
  } catch {
    return undefined;
  }
}

function normalizeFilePath(rawPath: string): string {
  if (rawPath.startsWith("file://")) {
    try {
      return fileURLToPath(rawPath);
    } catch {
      return rawPath;
    }
  }
  return rawPath;
}

export function isCdnUploadableUrl(text: string): boolean {
  const parsed = parseUrl(text);
  if (!parsed) {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  return parsed.hostname !== "cdn.hackclub.com";
}

export function isCdnHackclubUrl(text: string): boolean {
  const parsed = parseUrl(text);
  if (!parsed) {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  return parsed.hostname === "cdn.hackclub.com";
}

export async function resolveClipboardInput(): Promise<ClipboardResolution> {
  const content = await Clipboard.read();

  if (content.file) {
    return { type: "file", path: normalizeFilePath(content.file), needsConfirm: false };
  }

  const text = content.text?.trim();
  if (!text) {
    return { type: "none" };
  }

  if (existsSync(text)) {
    return { type: "path-text", path: text, needsConfirm: true };
  }

  const parsed = parseUrl(text);
  if (parsed && (parsed.protocol === "http:" || parsed.protocol === "https:")) {
    if (parsed.hostname === "cdn.hackclub.com") {
      return { type: "already-cdn-link" };
    }
    return { type: "url", url: text, needsConfirm: true };
  }

  return { type: "none" };
}
