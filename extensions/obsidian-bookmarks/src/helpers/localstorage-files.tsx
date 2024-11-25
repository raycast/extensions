import { LocalStorage } from "@raycast/api";
import { File, isFile, unique } from "../types";

function safelyRun<F extends (...args: any[]) => any>(func: F, defaultValue: ReturnType<F>): F {
  return ((...args: Parameters<F>) => {
    try {
      return func(...args);
    } catch (err) {
      console.error(`Could not safely ${func.prototype.name ? `run ${func.prototype.name}` : "handle files"}`, err);
      return defaultValue;
    }
  }) as F;
}

function isFileArray(v: unknown): v is File[] {
  if (v == null) return false;
  return Array.isArray(v) && v.every((val) => isFile(val));
}

function ensureDate(date: Date | string | undefined): Date {
  if (date instanceof Date) return date;
  if (typeof date === "string") return new Date(date);
  return new Date(); // Default to current date if undefined
}

async function getLocalStorageFilesInternal(): Promise<File[]> {
  const stored = await LocalStorage.getItem<string>("obsidian-files");
  if (!stored) return [];

  const json = JSON.parse(stored);
  if (isFileArray(json)) {
    // Convert saved dates from ISO strings back to Date objects
    return json.map((file) => ({
      ...file,
      attributes: {
        ...file.attributes,
        saved: new Date(file.attributes.saved),
      },
    }));
  } else {
    throw new Error(`Unexpected format for obsidian files in Local Storage: ${stored}`);
  }
}

async function replaceLocalStorageFilesInternal(files: File[]): Promise<void> {
  const sanitizedFiles = files.map((file) => {
    // Ensure we have a valid date
    const saved = ensureDate(file.attributes.saved);

    return {
      attributes: {
        source: file.attributes.source || "",
        publisher: file.attributes.publisher || null,
        title: file.attributes.title || "",
        tags: file.attributes.tags || [],
        saved: saved.toISOString(),
        read: !!file.attributes.read, // Ensure boolean
      },
      fileName: file.fileName || "",
      fullPath: file.fullPath || "",
      frontmatter: file.frontmatter || null,
      bodyBegin: file.bodyBegin || null,
    };
  });

  try {
    const json = JSON.stringify(sanitizedFiles);
    // Validate that we can parse it back
    JSON.parse(json);
    await LocalStorage.setItem("obsidian-files", json);
  } catch (error) {
    console.error("Failed to serialize files:", error);
    throw error;
  }
}

async function addToLocalStorageFilesInternal(files: File[]): Promise<void> {
  const existing = await getLocalStorageFilesInternal();
  const newSet = unique([...existing, ...files]);
  await replaceLocalStorageFilesInternal(newSet);
}

export const getLocalStorageFiles = safelyRun(getLocalStorageFilesInternal, Promise.resolve([]));
export const replaceLocalStorageFiles = safelyRun(replaceLocalStorageFilesInternal, Promise.resolve(undefined));
export const addToLocalStorageFiles = safelyRun(addToLocalStorageFilesInternal, Promise.resolve(undefined));
