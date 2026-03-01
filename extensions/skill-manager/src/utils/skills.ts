import { promises as fs } from "fs";
import path from "path";
import { getCentralSkillsPath, importMissingSkillsFromAgents } from "./central-skills";

export interface Skill {
  name: string;
  description: string;
  tags: string[];
  folderPath?: string;
  skillFilePath?: string;
}

interface LoadSkillsOptions {
  autoImportFromAgents?: boolean;
}

const TAG_LINE_RE = /^\[tags:\s*([^\]]*)\]\s*$/i;

function sanitizeSkillFolderName(name: string): string {
  return (
    name
      .trim()
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled-skill"
  );
}

function parseTagsFromLine(line: string): string[] {
  const match = line.trim().match(TAG_LINE_RE);
  if (!match) {
    return [];
  }
  return match[1]
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function renderSkillMarkdown(skill: Skill): string {
  const tagsLine = skill.tags.length > 0 ? `[tags: ${skill.tags.join(", ")}]\n\n` : "\n";
  const description = skill.description.trim();
  return `# ${skill.name}\n${tagsLine}${description}\n`;
}

async function readSkillFromFolder(skillFolderPath: string, fallbackName: string): Promise<Skill | null> {
  const skillMdPath = path.join(skillFolderPath, "SKILL.md");
  let content: string;
  try {
    content = await fs.readFile(skillMdPath, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }

  const lines = content.split("\n");
  let name = fallbackName;
  let start = 0;
  let frontmatterDescription = "";

  if (lines[0]?.trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "---") {
        start = i + 1;
        break;
      }
      const nameMatch = line.match(/^name:\s*["']?(.+?)["']?$/i);
      if (nameMatch && nameMatch[1].trim()) {
        name = nameMatch[1].trim();
      }
      const descriptionMatch = line.match(/^description:\s*["']?(.+?)["']?$/i);
      if (descriptionMatch && descriptionMatch[1].trim()) {
        frontmatterDescription = descriptionMatch[1].trim();
      }
    }
  }

  let headingLineIndex = -1;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }
    if (line.startsWith("#")) {
      name = line.replace(/^#+\s*/, "").trim() || name;
      headingLineIndex = i;
      start = i + 1;
    }
    break;
  }

  let tags: string[] = [];
  let tagLineIndex = -1;
  for (let i = start; i < lines.length; i++) {
    if (!lines[i].trim()) {
      continue;
    }
    const parsedTags = parseTagsFromLine(lines[i]);
    if (parsedTags.length > 0 || TAG_LINE_RE.test(lines[i].trim())) {
      tags = parsedTags;
      tagLineIndex = i;
    }
    break;
  }

  const descriptionLines: string[] = [];
  for (let i = start; i < lines.length; i++) {
    if (i === tagLineIndex || i === headingLineIndex) {
      continue;
    }
    descriptionLines.push(lines[i]);
  }
  const description = descriptionLines.join("\n").trim() || frontmatterDescription;

  return { name, description, tags, folderPath: skillFolderPath, skillFilePath: skillMdPath };
}

async function findSkillFolderByName(name: string): Promise<string | null> {
  const centralPath = getCentralSkillsPath();
  const entries = await fs.readdir(centralPath, { withFileTypes: true });
  const target = entries.find(
    (entry) => (entry.isDirectory() || entry.isSymbolicLink()) && entry.name.toLowerCase() === name.toLowerCase(),
  );
  return target ? path.join(centralPath, target.name) : null;
}

/**
 * Legacy helper retained for compatibility. Skills are now folder-based in central skills.
 */
export function getSkillsFilePath(): string {
  return path.join(getCentralSkillsPath(), "skills.md");
}

/**
 * Legacy parser retained for compatibility with older markdown list format.
 */
export function parseSkillsMarkdown(content: string): Skill[] {
  const skills: Skill[] = [];
  const sections = content.split(/^##\s+/m).filter((s) => s.trim().length > 0);

  for (const section of sections) {
    const lines = section.split("\n");
    const name = lines[0].trim();
    if (!name) continue;

    const bodyLines = lines.slice(1);
    let tags: string[] = [];
    const tagLineIndex = bodyLines.findIndex((l) => /^\[tags:/i.test(l.trim()));
    if (tagLineIndex !== -1) {
      const tagMatch = bodyLines[tagLineIndex].match(/\[tags:\s*([^\]]+)\]/i);
      if (tagMatch) {
        tags = tagMatch[1]
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
      bodyLines.splice(tagLineIndex, 1);
    }

    const description = bodyLines.join("\n").trim();
    skills.push({ name, description, tags });
  }

  return skills;
}

/**
 * Legacy serializer retained for compatibility with older markdown list format.
 */
export function serializeSkillsMarkdown(skills: Skill[]): string {
  const header = "# Skills\n\n";
  if (skills.length === 0) return header;
  const body = skills
    .map((skill) => {
      const tagLine = skill.tags.length > 0 ? `[tags: ${skill.tags.join(", ")}]\n` : "";
      return `## ${skill.name}\n${tagLine}${skill.description}\n`;
    })
    .join("\n");

  return header + body;
}

/**
 * Load skills from central folder (`~/agents/skills`) by reading each `SKILL.md`.
 */
export async function loadSkills(options: LoadSkillsOptions = {}): Promise<Skill[]> {
  const autoImportFromAgents = options.autoImportFromAgents ?? true;
  if (autoImportFromAgents) {
    try {
      await importMissingSkillsFromAgents();
    } catch {
      // Listing should still work even if an agent folder is unavailable.
    }
  }

  const centralPath = getCentralSkillsPath();
  await fs.mkdir(centralPath, { recursive: true });

  const entries = await fs.readdir(centralPath, { withFileTypes: true });
  const skills: Skill[] = [];

  for (const entry of entries) {
    if ((!entry.isDirectory() && !entry.isSymbolicLink()) || entry.name.startsWith(".")) {
      continue;
    }

    const folderPath = path.join(centralPath, entry.name);
    try {
      const stat = await fs.stat(folderPath);
      if (!stat.isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }

    const parsed = await readSkillFromFolder(folderPath, entry.name);
    if (parsed) {
      skills.push(parsed);
    }
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Save to folder-based storage. Existing folder name is reused when updating.
 */
export async function upsertSkill(skill: Skill): Promise<void> {
  const centralPath = getCentralSkillsPath();
  await fs.mkdir(centralPath, { recursive: true });

  const existingFolder = await findSkillFolderByName(skill.name);
  const folderName = existingFolder ? path.basename(existingFolder) : sanitizeSkillFolderName(skill.name);
  const folderPath = path.join(centralPath, folderName);
  const skillMdPath = path.join(folderPath, "SKILL.md");

  await fs.mkdir(folderPath, { recursive: true });
  await fs.writeFile(skillMdPath, renderSkillMarkdown(skill), "utf8");
}

/**
 * Delete skill folder by matching folder name case-insensitively.
 */
export async function deleteSkill(name: string): Promise<void> {
  const centralPath = getCentralSkillsPath();
  await fs.mkdir(centralPath, { recursive: true });

  const folderPath = await findSkillFolderByName(name);
  if (!folderPath) {
    return;
  }

  await fs.rm(folderPath, { recursive: true, force: true });
}
