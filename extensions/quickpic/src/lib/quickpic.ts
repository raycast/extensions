import { LocalStorage, environment } from "@raycast/api";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

import type { ImportImageInput, QuickPicLibrary, QuickPicResolvedItem } from "../types";

const LIBRARY_STORAGE_KEY = "quickpic-library-v1";
const IMAGE_DIRECTORY = "images";
const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".heic",
  ".heif",
  ".bmp",
  ".tif",
  ".tiff",
  ".avif",
]);

export function parseKeywords(rawValue: string): string[] {
  return Array.from(
    new Set(
      rawValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

export async function readLibrary(): Promise<QuickPicResolvedItem[]> {
  const stored = await LocalStorage.getItem<string>(LIBRARY_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  let library: QuickPicLibrary;
  try {
    library = JSON.parse(stored) as QuickPicLibrary;
  } catch {
    return [];
  }

  return library.items.map((item) => ({
    ...item,
    filePath: resolveLibraryFilePath(item.relativePath),
  }));
}

export async function importImage(input: ImportImageInput): Promise<QuickPicResolvedItem> {
  const sourcePath = path.resolve(input.sourcePath.trim());
  const stats = await fs.stat(sourcePath);

  if (!stats.isFile()) {
    throw new Error("The selected path is not a file.");
  }

  const extension = path.extname(sourcePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) {
    throw new Error("The selected file is not a supported image.");
  }

  const normalizedKeywords = Array.from(new Set(input.keywords.map((keyword) => keyword.trim()).filter(Boolean)));
  if (normalizedKeywords.length === 0) {
    throw new Error("Add at least one keyword.");
  }

  const id = randomUUID();
  const relativePath = path.join(IMAGE_DIRECTORY, `${id}${extension}`);
  const targetPath = resolveLibraryFilePath(relativePath);

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);

  const title = input.title?.trim() || path.parse(sourcePath).name;
  const item = {
    id,
    title,
    keywords: normalizedKeywords,
    originalName: path.basename(sourcePath),
    relativePath,
    createdAt: new Date().toISOString(),
  };

  try {
    const items = await readLibrary();
    items.unshift({
      ...item,
      filePath: targetPath,
    });

    await writeLibrary(items);
  } catch (error) {
    await fs.rm(targetPath, { force: true });
    throw error;
  }

  return {
    ...item,
    filePath: targetPath,
  };
}

export async function removeImage(id: string): Promise<void> {
  const items = await readLibrary();
  const target = items.find((item) => item.id === id);
  const remainingItems = items.filter((item) => item.id !== id);

  if (target) {
    await fs.rm(target.filePath, { force: true });
  }

  await writeLibrary(remainingItems);
}

function resolveLibraryFilePath(relativePath: string): string {
  return path.join(environment.supportPath, relativePath);
}

async function writeLibrary(items: QuickPicResolvedItem[]): Promise<void> {
  const library: QuickPicLibrary = {
    version: 1,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      keywords: item.keywords,
      originalName: item.originalName,
      relativePath: item.relativePath,
      createdAt: item.createdAt,
    })),
  };

  await LocalStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
}
