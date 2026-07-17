import fs from "node:fs/promises";
import path from "node:path";

import { Classification, CreatedNote, vaultRootFolder, VaultProfile } from "./types";

const skippedDirectories = new Set([".git", ".obsidian", ".trash", "node_modules", "_attachments"]);
const excludedDestinationPrefixes = ["90 Archive", "Excalidraw"];
const sensitiveFilenamePattern = /(?:credential|creds?|password|secrets?|tokens?|api[-_ ]?keys?)/i;
const sensitiveContentPatterns = [
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:sk|sk-or|ghp|github_pat|xox[baprs])[-_][A-Za-z0-9_-]{12,}\b/,
  /\bAIza[A-Za-z0-9_-]{20,}\b/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/i,
  /\b(?:api[_ -]?key|access[_ -]?key|client[_ -]?secret|secret[_ -]?key|password|token)\b\s*[:=]\s*\S{8,}/i,
];

const maximumProfileLength = 12_000;
const maximumExcerptLength = 320;
const maximumNotesPerFolder = 5;

export function containsLikelySecret(filePath: string, content: string): boolean {
  if (sensitiveFilenamePattern.test(path.basename(filePath))) return true;
  if (sensitiveContentPatterns.some((pattern) => pattern.test(content))) return true;

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    lines.length > 0 &&
    lines.length <= 5 &&
    lines.every((line) => line.length >= 12 && !/\s/.test(line) && /[A-Za-z]/.test(line) && /\d/.test(line))
  );
}

function isExcludedDestination(folder: string): boolean {
  return excludedDestinationPrefixes.some((prefix) => folder === prefix || folder.startsWith(`${prefix}${path.sep}`));
}

async function collectMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || skippedDirectories.has(entry.name)) continue;

    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

function excerpt(content: string): string {
  return stripFrontmatter(content).replace(/\s+/g, " ").trim().slice(0, maximumExcerptLength);
}

export async function buildVaultProfile(vaultPath: string): Promise<VaultProfile> {
  const root = path.resolve(vaultPath);
  const stat = await fs.stat(root);
  if (!stat.isDirectory()) throw new Error("The configured vault path is not a directory.");

  const files = await collectMarkdownFiles(root);
  const grouped = new Map<string, string[]>();

  for (const file of files) {
    const folder = path.relative(root, path.dirname(file)) || vaultRootFolder;
    if (isExcludedDestination(folder)) continue;
    const group = grouped.get(folder) ?? [];
    group.push(file);
    grouped.set(folder, group);
  }

  const candidateFolders = [...grouped.entries()]
    .filter(([, folderFiles]) => folderFiles.some((file) => !/(?:^| )index\.md$/i.test(path.basename(file))))
    .map(([folder]) => folder)
    .sort();

  if (!candidateFolders.includes(vaultRootFolder)) candidateFolders.unshift(vaultRootFolder);

  const sections: string[] = [];
  for (const folder of candidateFolders) {
    const folderFiles = grouped.get(folder) ?? [];
    const ordered = [...folderFiles].sort((a, b) => {
      const aIndex = /(?:^| )index\.md$/i.test(path.basename(a));
      const bIndex = /(?:^| )index\.md$/i.test(path.basename(b));
      return Number(bIndex) - Number(aIndex) || a.localeCompare(b);
    });

    const examples: string[] = [];
    for (const file of ordered) {
      if (examples.length >= maximumNotesPerFolder) break;
      const content = await fs.readFile(file, "utf8");
      if (containsLikelySecret(file, content)) continue;
      const sample = excerpt(content);
      examples.push(`- ${path.basename(file, ".md")}${sample ? `: ${sample}` : ""}`);
    }

    sections.push(`FOLDER: ${folder}\n${examples.join("\n") || "- No safe content examples available."}`);
  }

  return {
    candidateFolders,
    context: sections.join("\n\n").slice(0, maximumProfileLength),
  };
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function validateNotePath(vaultPath: string, notePath: string): string {
  const root = path.resolve(vaultPath);
  const target = path.resolve(notePath);
  if (!isInside(root, target) || path.extname(target).toLowerCase() !== ".md") {
    throw new Error("The selected note is not a Markdown file inside this vault.");
  }

  return target;
}

export async function createNote(
  vaultPath: string,
  classification: Classification,
  content: string
): Promise<CreatedNote> {
  const root = path.resolve(vaultPath);
  const destination = path.resolve(root, classification.folder);
  if (destination !== root && !isInside(root, destination)) throw new Error("AI selected an invalid destination.");

  const destinationStat = await fs.stat(destination);
  if (!destinationStat.isDirectory()) throw new Error("AI selected a destination that does not exist.");

  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const suffix = attempt === 1 ? "" : ` ${attempt}`;
    const filename = `${classification.title}${suffix}.md`;
    const absolutePath = path.join(destination, filename);

    try {
      await fs.writeFile(absolutePath, `${content.trim()}\n`, { encoding: "utf8", flag: "wx" });
      return { absolutePath, relativePath: path.relative(root, absolutePath) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }

  throw new Error("Could not find an unused filename for this note.");
}
