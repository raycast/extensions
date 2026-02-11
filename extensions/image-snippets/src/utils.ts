import { getPreferenceValues } from "@raycast/api";
import { Preferences } from "../raycast-env.d";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";
import { ImageSnippet, SnippetsData } from "./types";

const SNIPPETS_FILE = "snippets.json";

export function expandPath(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

export function getImagesFolder(): string {
  const preferences = getPreferenceValues<Preferences>();
  return expandPath(preferences.imagesFolder || "~/Pictures/raycast-snippets");
}

export function getSnippetsFilePath(): string {
  return join(getImagesFolder(), SNIPPETS_FILE);
}

export function ensureFolderExists(): void {
  const folder = getImagesFolder();
  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true });
  }
}

export function loadSnippetsData(): SnippetsData {
  const filePath = getSnippetsFilePath();
  if (!existsSync(filePath)) {
    return { snippets: [] };
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as SnippetsData;
  } catch {
    return { snippets: [] };
  }
}

export function saveSnippetsData(data: SnippetsData): void {
  ensureFolderExists();
  const filePath = getSnippetsFilePath();
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function getSnippet(id: string): ImageSnippet | undefined {
  const data = loadSnippetsData();
  return data.snippets.find((s) => s.id === id);
}

export function addSnippet(snippet: ImageSnippet): void {
  const data = loadSnippetsData();
  // remove existing with same id if any
  data.snippets = data.snippets.filter((s) => s.id !== snippet.id);
  data.snippets.push(snippet);
  saveSnippetsData(data);
}

export function updateSnippet(
  id: string,
  updates: Partial<ImageSnippet>,
): void {
  const data = loadSnippetsData();
  const index = data.snippets.findIndex((s) => s.id === id);
  if (index !== -1) {
    data.snippets[index] = { ...data.snippets[index], ...updates };
    saveSnippetsData(data);
  }
}

export function deleteSnippet(id: string): void {
  const data = loadSnippetsData();
  data.snippets = data.snippets.filter((s) => s.id !== id);
  saveSnippetsData(data);
}

export function togglePinSnippet(id: string): boolean {
  const data = loadSnippetsData();
  const snippet = data.snippets.find((s) => s.id === id);
  if (snippet) {
    snippet.pinned = !snippet.pinned;
    saveSnippetsData(data);
    return snippet.pinned;
  }
  return false;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateFileName(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `snippet-${timestamp}.png`;
}

export async function copyImageToClipboard(imagePath: string): Promise<void> {
  const script = `
    set theFile to POSIX file "${imagePath}"
    set theImage to read theFile as TIFF picture
    set the clipboard to theImage
  `;
  execSync(`osascript -e '${script}'`);
}

export async function getClipboardImage(): Promise<{
  data: Uint8Array;
  tempPath: string;
} | null> {
  try {
    const checkScript = `
      try
        set theData to the clipboard as «class PNGf»
        return "png"
      on error
        try
          set theData to the clipboard as TIFF picture
          return "tiff"
        on error
          return "none"
        end try
      end try
    `;

    const result = execSync(`osascript -e '${checkScript}'`).toString().trim();

    if (result === "none") {
      return null;
    }

    const tempPath = `/tmp/raycast-clipboard-${Date.now()}.png`;
    const extractScript = `
      set theFile to POSIX file "${tempPath}"
      try
        set theData to the clipboard as «class PNGf»
        set fileRef to open for access theFile with write permission
        write theData to fileRef
        close access fileRef
        return "success"
      on error errMsg
        try
          close access theFile
        end try
        return "error: " & errMsg
      end try
    `;

    const extractResult = execSync(`osascript -e '${extractScript}'`)
      .toString()
      .trim();

    if (extractResult.startsWith("error")) {
      return null;
    }

    const imageBuffer: Uint8Array = new Uint8Array(readFileSync(tempPath));

    return { data: imageBuffer, tempPath };
  } catch {
    return null;
  }
}

export function cleanupTempFile(tempPath: string): void {
  try {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
  } catch {
    // ignore cleanup errors
  }
}
