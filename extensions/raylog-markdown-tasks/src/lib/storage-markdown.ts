import fs from "fs";
import path from "path";
import { RAYLOG_END_MARKER, RAYLOG_START_MARKER } from "./constants";
import { RaylogConfigurationError, RaylogInitializationRequiredError } from "./storage-errors";
import { createEmptyDocument, parseRaylogMarkdown, RAYLOG_BLOCK_PATTERN } from "./storage-schema";
import type { RaylogDocument } from "./types";

export function createManagedBlock(document: RaylogDocument): string {
  return `${RAYLOG_START_MARKER}
\`\`\`json
${JSON.stringify(document, null, 2)}
\`\`\`
${RAYLOG_END_MARKER}`;
}

export function mergeRaylogMarkdown(markdown: string, document: RaylogDocument): string {
  const block = createManagedBlock(document);
  if (RAYLOG_BLOCK_PATTERN.test(markdown)) {
    return markdown.replace(RAYLOG_BLOCK_PATTERN, block);
  }

  const trimmed = markdown.trimEnd();
  if (!trimmed) {
    return `${block}\n`;
  }

  return `${trimmed}\n\n${block}\n`;
}

export async function ensureStorageNote(notePath: string): Promise<void> {
  await readValidatedStorageMarkdown(notePath);
}

export async function resetStorageNote(notePath: string): Promise<void> {
  await validateStorageNotePath(notePath);
  const markdown = await fs.promises.readFile(notePath, "utf8");
  await writeMarkdownAtomically(notePath, mergeRaylogMarkdown(markdown, createEmptyDocument()));
}

export async function validateStorageNotePath(notePath?: string): Promise<void> {
  if (!notePath) {
    throw new RaylogConfigurationError("Select a markdown note to store Raylog data.");
  }

  if (path.extname(notePath).toLowerCase() !== ".md") {
    throw new RaylogConfigurationError("Raylog storage must point to a markdown file.");
  }

  let stats: fs.Stats;
  try {
    stats = await fs.promises.stat(notePath);
  } catch {
    throw new RaylogConfigurationError("The configured Raylog storage note does not exist.");
  }

  if (!stats.isFile()) {
    throw new RaylogConfigurationError("The configured Raylog storage path is not a file.");
  }
}

export async function readStorageDocument(notePath: string): Promise<RaylogDocument> {
  const markdown = await readValidatedStorageMarkdown(notePath);
  return parseRaylogMarkdown(markdown).document;
}

export async function readStorageMarkdown(notePath: string): Promise<string> {
  return readValidatedStorageMarkdown(notePath);
}

export async function writeStorageDocument(
  notePath: string,
  originalMarkdown: string,
  document: RaylogDocument,
): Promise<void> {
  await writeMarkdownAtomically(notePath, mergeRaylogMarkdown(originalMarkdown, document));
}

async function writeMarkdownAtomically(notePath: string, markdown: string): Promise<void> {
  const directory = path.dirname(notePath);
  const basename = path.basename(notePath);
  const tempPath = path.join(directory, `.${basename}.${process.pid}.${Date.now()}.tmp`);

  await fs.promises.mkdir(directory, { recursive: true });
  await fs.promises.writeFile(tempPath, markdown, "utf8");

  try {
    await fs.promises.rename(tempPath, notePath);
  } catch (error) {
    await fs.promises.rm(tempPath, { force: true });

    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.promises.writeFile(notePath, markdown, "utf8");
      return;
    }

    throw error;
  }
}

async function readValidatedStorageMarkdown(notePath: string): Promise<string> {
  await validateStorageNotePath(notePath);
  const markdown = await fs.promises.readFile(notePath, "utf8");
  const { hasManagedBlock } = parseRaylogMarkdown(markdown);

  if (!hasManagedBlock) {
    throw new RaylogInitializationRequiredError(
      "The configured task storage note does not contain a valid Raylog database.",
    );
  }

  return markdown;
}
