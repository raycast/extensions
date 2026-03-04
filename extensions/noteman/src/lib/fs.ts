import { trash } from "@raycast/api";
import {
  access,
  appendFile,
  mkdir,
  open,
  readFile,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export function expandHome(inputPath: string): string {
  if (!inputPath) {
    return inputPath;
  }

  if (inputPath === "~") {
    return homedir();
  }

  if (inputPath.startsWith("~/")) {
    return path.join(homedir(), inputPath.slice(2));
  }

  return inputPath;
}

export async function ensureDirExists(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function appendToFile(
  filePath: string,
  text: string,
): Promise<void> {
  await appendFile(filePath, text, { encoding: "utf8" });
}

export async function ensureUniqueFilename(
  dir: string,
  filename: string,
): Promise<string> {
  const extension = path.extname(filename);
  const basename = path.basename(filename, extension);

  let candidate = filename;
  let counter = 2;

  while (true) {
    try {
      await access(path.join(dir, candidate), constants.F_OK);
      candidate = `${basename}-${counter}${extension}`;
      counter += 1;
    } catch {
      return candidate;
    }
  }
}

export async function readFileUtf8(filePath: string): Promise<string> {
  return readFile(filePath, { encoding: "utf8" });
}

export async function writeFileUtf8(
  filePath: string,
  content: string,
): Promise<void> {
  await writeFile(filePath, content, { encoding: "utf8" });
}

export async function writeFileUtf8Exclusive(
  filePath: string,
  content: string,
): Promise<void> {
  const handle = await open(filePath, "wx");
  try {
    await handle.writeFile(content, { encoding: "utf8" });
  } finally {
    await handle.close();
  }
}

export async function moveToTrash(filePath: string): Promise<void> {
  try {
    await trash(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to move note to Trash: ${message}`);
  }
}
