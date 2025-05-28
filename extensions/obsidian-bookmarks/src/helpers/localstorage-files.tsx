import { LocalStorage } from "@raycast/api";
import { File, isFile, unique } from "../types";

type SafelyRunFunc<Args extends unknown[], Return> = (...args: Args) => Return;

function safelyRun<Args extends unknown[], Return>(
  func: SafelyRunFunc<Args, Return>,
  defaultValue: Return
): SafelyRunFunc<Args, Return> {
  return (...args: Args) => {
    try {
      return func(...args);
    } catch (err) {
      console.error(`Could not safely ${func.prototype.name ? `run ${func.prototype.name}` : "handle files"}`, err);
      return defaultValue;
    }
  };
}

function isFileArray(v: unknown): v is File[] {
  if (v == null) return false;
  return Array.isArray(v) && v.every((val) => isFile(val));
}

async function getLocalStorageFilesInternal(): Promise<File[]> {
  const stored = await LocalStorage.getItem<string>("obsidian-files");
  if (!stored) return [];

  try {
    const json = JSON.parse(stored);
    if (isFileArray(json)) {
      return json.map((file) => ({
        ...file,
        attributes: {
          ...file.attributes,
          saved: new Date(file.attributes.saved),
        },
        mtime: Number(file.mtime),
      }));
    } else {
      throw new Error(`Unexpected format for obsidian files in Local Storage: ${stored}`);
    }
  } catch (error) {
    console.error("Error parsing stored files:", error);
    return [];
  }
}

interface SerializedFile {
  attributes: {
    source: string;
    publisher: string | null;
    title: string;
    tags: string[];
    saved: string;
    read: boolean;
  };
  mtime: number;
  frontmatter: string | null;
  bodyBegin: number | null;
  fileName: string;
  fullPath: string;
}

async function replaceLocalStorageFilesInternal(files: File[]): Promise<void> {
  const sanitizedFiles = files.map((file) => ({
    ...file,
    attributes: {
      ...file.attributes,
      source: file.attributes.source || "",
      publisher: file.attributes.publisher || null,
      title: file.attributes.title || "",
      tags: file.attributes.tags || [],
      saved: file.attributes.saved.toISOString(),
      read: !!file.attributes.read,
    },
    mtime: Number(file.mtime),
    frontmatter: file.frontmatter || null,
    bodyBegin: file.bodyBegin || null,
  }));

  try {
    const json = JSON.stringify(sanitizedFiles);
    const parsed = JSON.parse(json) as SerializedFile[];
    if (!parsed.every((f) => typeof f.mtime === "number" && f.mtime > 0)) {
      console.error("Validation failed: some files have invalid mtime");
    }
    await LocalStorage.setItem("obsidian-files", json);
  } catch (error) {
    console.error("Failed to serialize files:", error);
    throw error;
  }
}

async function addToLocalStorageFilesInternal(files: File[]): Promise<void> {
  const existing = await getLocalStorageFilesInternal();
  const newSet = unique([...existing, ...files]);
  await replaceLocalStorageFiles(newSet);
}

export const getLocalStorageFiles = safelyRun(getLocalStorageFilesInternal, Promise.resolve([]));
export const replaceLocalStorageFiles = safelyRun(replaceLocalStorageFilesInternal, Promise.resolve(undefined));
export const addToLocalStorageFiles = safelyRun(addToLocalStorageFilesInternal, Promise.resolve(undefined));
