import fs from "fs";

export interface ReadingEntry {
  url: string;
  title: string;
  author: string | null;
  publishedDate: string | null;
  addedDate: string;
  thoughts?: string;
}

export interface ReadLaterEntry {
  url: string;
  title: string;
  addedAt: string;
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
