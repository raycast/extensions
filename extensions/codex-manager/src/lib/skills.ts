import { execFile } from "child_process";
import fs from "fs/promises";
import { Dirent } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { trash } from "@raycast/api";
import matter from "gray-matter";
import type { Skill, SkillMetadata } from "@/types";

const SKILL_FILE = "SKILL.md";
const execFileAsync = promisify(execFile);

function toTitleCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function buildSkillTemplate(name: string, metadata?: SkillMetadata): string {
  const description = metadata?.description ?? "Describe what this skill does.";
  const title = toTitleCase(name);

  const formatValue = (value: string) => (value.trim().length > 0 ? value : '""');

  return `---\nname: ${name}\ndescription: ${formatValue(description)}\nmetadata:\n  short-description: ${formatValue(description)}\n---\n\n# ${title}\n\nDescribe what this skill does...\n`;
}

function extractFirstHeading(markdown: string): string | undefined {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

export async function listSkills(skillsDir: string): Promise<Skill[]> {
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(skillsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const skills: Skill[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name.startsWith(".")) {
      continue;
    }

    const skillPath = path.join(skillsDir, entry.name);
    const skillFile = path.join(skillPath, SKILL_FILE);
    let hasSkillFile = false;
    let metadata: SkillMetadata | undefined;
    let description: string | undefined;
    let fileCount = 0;

    try {
      const content = await fs.readFile(skillFile, "utf8");
      hasSkillFile = true;
      const parsed = matter(content);
      metadata = parsed.data as SkillMetadata;
      description = metadata?.description ?? extractFirstHeading(parsed.content);
    } catch {
      hasSkillFile = false;
    }

    const stats = await getSkillStats(skillPath);
    fileCount = stats.fileCount;

    skills.push({
      name: entry.name,
      path: skillPath,
      hasSkillFile,
      metadata,
      description,
      fileCount,
    });
  }

  return skills;
}

type SkillStats = {
  fileCount: number;
};

async function getSkillStats(skillPath: string): Promise<SkillStats> {
  let count = 0;

  async function walk(currentPath: string) {
    const items = await fs.readdir(currentPath, { withFileTypes: true });
    for (const item of items) {
      if (item.name.startsWith(".")) {
        continue;
      }
      const nextPath = path.join(currentPath, item.name);
      if (item.isDirectory()) {
        await walk(nextPath);
      } else {
        count += 1;
      }
    }
  }

  try {
    await walk(skillPath);
  } catch {
    return { fileCount: 0 };
  }

  return {
    fileCount: count,
  };
}

export async function createSkill(
  skillsDir: string,
  name: string,
  metadata?: SkillMetadata,
  contentOverride?: string,
): Promise<string> {
  const skillPath = path.join(skillsDir, name);
  await fs.mkdir(skillPath, { recursive: true });
  const skillFile = path.join(skillPath, SKILL_FILE);
  const content = contentOverride?.trim() ? contentOverride : buildSkillTemplate(name, metadata);
  await fs.writeFile(skillFile, content, "utf8");
  return skillPath;
}

export async function deleteSkill(skillPath: string): Promise<void> {
  await trash(skillPath);
}

export async function updateSkillMetadata(skillPath: string, metadata: SkillMetadata): Promise<void> {
  const skillFile = path.join(skillPath, SKILL_FILE);
  const content = await fs.readFile(skillFile, "utf8");
  const parsed = matter(content);
  const updated = matter.stringify(parsed.content, metadata);
  await fs.writeFile(skillFile, updated, "utf8");
}

export async function updateSkillContent(skillPath: string, content: string): Promise<void> {
  const skillFile = path.join(skillPath, SKILL_FILE);
  await fs.writeFile(skillFile, content, "utf8");
}

type ImportSkillOptions = {
  overwrite?: boolean;
  skillName?: string;
};

type ZipValidationResult = { mode: "root" } | { mode: "folder"; rootFolder: string };

async function listZipEntries(zipPath: string): Promise<string[]> {
  const { stdout } = await execFileAsync("unzip", ["-Z1", zipPath], {
    encoding: "utf8",
  });
  return stdout
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function extractZip(zipPath: string, destination: string): Promise<void> {
  await execFileAsync("ditto", ["-x", "-k", zipPath, destination]);
}

async function copyDirectory(source: string, destination: string): Promise<void> {
  await execFileAsync("ditto", [source, destination]);
}

function isIgnorableZipEntry(entry: string): boolean {
  const firstSegment = entry.split("/")[0] ?? "";
  if (!firstSegment) {
    return true;
  }
  if (firstSegment === "__MACOSX") {
    return true;
  }
  if (firstSegment.startsWith(".") || entry.endsWith(".DS_Store")) {
    return true;
  }
  return false;
}

function validateZipEntries(entries: string[]): ZipValidationResult {
  const relevant = entries.filter((entry) => !isIgnorableZipEntry(entry));
  const fileEntries = relevant.filter((entry) => !entry.endsWith("/"));
  const skillFiles = fileEntries.filter((entry) => path.posix.basename(entry) === SKILL_FILE);
  if (skillFiles.length === 0) {
    throw new Error("ZIP must include a SKILL.md file.");
  }
  if (skillFiles.length > 1) {
    throw new Error("ZIP must include exactly one SKILL.md file.");
  }

  const rootFiles = fileEntries.filter((entry) => !entry.includes("/"));
  if (rootFiles.length > 0) {
    return { mode: "root" };
  }

  const topLevel = new Set(fileEntries.map((entry) => entry.split("/")[0]).filter(Boolean));
  if (topLevel.size !== 1) {
    throw new Error("ZIP must contain files at the root level or a single root folder.");
  }

  const rootFolder = Array.from(topLevel)[0];
  return { mode: "folder", rootFolder };
}

export async function importSkillFromZip(
  skillsDir: string,
  zipPath: string,
  options: ImportSkillOptions = {},
): Promise<string> {
  const fallbackName = path.basename(zipPath, path.extname(zipPath));
  const skillName = options.skillName?.trim() || fallbackName;
  const targetDir = path.join(skillsDir, skillName);

  const entries = await listZipEntries(zipPath);
  const validation = validateZipEntries(entries);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-skill-"));
  try {
    await extractZip(zipPath, tempDir);
    const sourceDir = validation.mode === "folder" ? path.join(tempDir, validation.rootFolder) : tempDir;
    await fs.stat(sourceDir);
    if (options.overwrite) {
      await trash(targetDir);
    }
    await copyDirectory(sourceDir, targetDir);
    return targetDir;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function findSkillFileEntry(entries: string[]): string {
  const fileEntries = entries.filter((entry) => !entry.endsWith("/") && !isIgnorableZipEntry(entry));
  const skillFiles = fileEntries.filter((entry) => path.posix.basename(entry) === SKILL_FILE);
  if (skillFiles.length === 0) {
    throw new Error("ZIP must include a SKILL.md file.");
  }
  if (skillFiles.length > 1) {
    throw new Error("ZIP must include exactly one SKILL.md file.");
  }
  return skillFiles[0];
}

export async function getSkillMarkdownFromZip(zipPath: string): Promise<string> {
  const entries = await listZipEntries(zipPath);
  const skillEntry = findSkillFileEntry(entries);
  const { stdout } = await execFileAsync("unzip", ["-p", zipPath, skillEntry], {
    encoding: "utf8",
  });
  return stdout;
}
