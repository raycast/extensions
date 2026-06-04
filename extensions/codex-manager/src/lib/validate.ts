import matter from "gray-matter";
import type { McpServerDoc, Skill } from "@/types";
import { detectMcpBlockKey, getMcpServers } from "@/lib/mcp";
import { listSkills } from "@/lib/skills";
import { pathExists } from "@/lib/paths";

const MCP_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-_]{1,63}$/;

export function validateMcpServer(name: string, server: McpServerDoc): string[] {
  const errors: string[] = [];

  if (!name || !MCP_NAME_PATTERN.test(name)) {
    errors.push("Invalid MCP server name.");
  }

  if (typeof server.command !== "string" || server.command.trim().length === 0) {
    errors.push("Command is required.");
  }

  if (
    server.args !== undefined &&
    (!Array.isArray(server.args) || server.args.some((arg) => typeof arg !== "string"))
  ) {
    errors.push("Args must be an array of strings.");
  }

  if (server.env !== undefined) {
    if (typeof server.env !== "object" || server.env === null || Array.isArray(server.env)) {
      errors.push("Env must be an object of string values.");
    } else {
      for (const [key, value] of Object.entries(server.env)) {
        if (typeof value !== "string") {
          errors.push(`Env value for ${key} must be a string.`);
        }
      }
    }
  }

  if (server.cwd !== undefined && typeof server.cwd !== "string") {
    errors.push("Cwd must be a string.");
  }

  if (server.enabled !== undefined && typeof server.enabled !== "boolean") {
    errors.push("Enabled must be a boolean.");
  }

  return errors;
}

export function validateMcpServers(servers: Record<string, McpServerDoc>): string[] {
  const errors: string[] = [];
  for (const [name, server] of Object.entries(servers)) {
    const serverErrors = validateMcpServer(name, server);
    errors.push(...serverErrors.map((error) => `${name}: ${error}`));
  }
  return errors;
}

export function validateConfigDoc(doc: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const blockKey = detectMcpBlockKey(doc);
  if (!blockKey) {
    errors.push("No MCP block found.");
    return errors;
  }

  const servers = getMcpServers(doc);
  errors.push(...validateMcpServers(servers));
  return errors;
}

export function validateSkillName(name: string): string | null {
  if (!SKILL_NAME_PATTERN.test(name)) {
    return "Invalid skill name (lowercase, numbers, dashes or underscores).";
  }
  return null;
}

export type SkillFormErrors = {
  name?: string;
  content?: string;
};

export function validateSkillNameWithDuplicates(name: string, existingNames: string[]): string | undefined {
  const nameError = validateSkillName(name);
  if (nameError) {
    return nameError;
  }
  const existingNamesSet = new Set(existingNames.map((existingName) => existingName.toLowerCase()));
  if (existingNamesSet.has(name.toLowerCase())) {
    return "Skill name already exists";
  }
  return undefined;
}

export function validateSkillContent(content: string | undefined, expectedName?: string): string | undefined {
  if (!content?.trim()) {
    return "SKILL.md content is required";
  }
  const parsed = matter(content);
  const nameValue = parsed.data?.name;
  const descriptionValue = parsed.data?.description;
  if (typeof nameValue !== "string" || nameValue.trim().length === 0) {
    return "Frontmatter must include a non-empty name.";
  }
  if (typeof descriptionValue !== "string" || descriptionValue.trim().length === 0) {
    return "Frontmatter must include a non-empty description.";
  }
  if (expectedName && nameValue.trim() !== expectedName.trim()) {
    return `Frontmatter name must match "${expectedName.trim()}".`;
  }
  return undefined;
}

type SkillFormValues = {
  name: string;
  content?: string;
};

type SkillValidationOptions = {
  existingNames?: string[];
  checkDuplicates?: boolean;
};

export function validateSkillForm(values: SkillFormValues, options: SkillValidationOptions = {}): SkillFormErrors {
  const trimmedName = values.name.trim();
  const nameError =
    options.checkDuplicates && options.existingNames
      ? validateSkillNameWithDuplicates(trimmedName, options.existingNames)
      : (validateSkillName(trimmedName) ?? undefined);

  return {
    name: nameError,
    content: validateSkillContent(values.content, trimmedName),
  };
}

export function validateSkills(skills: Skill[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();

  for (const skill of skills) {
    const nameError = validateSkillName(skill.name);
    if (nameError) {
      errors.push(`${skill.name}: ${nameError}`);
    }

    if (!skill.hasSkillFile) {
      errors.push(`${skill.name}: Missing SKILL.md.`);
    }

    const lower = skill.name.toLowerCase();
    const existing = seen.get(lower);
    if (existing && existing !== skill.name) {
      errors.push(`Duplicate skill name (case-insensitive): ${skill.name} vs ${existing}.`);
    } else {
      seen.set(lower, skill.name);
    }
  }

  return errors;
}

export async function validateSkillsFolder(skillsDir: string): Promise<string[]> {
  const exists = await pathExists(skillsDir);
  if (!exists) {
    return [`Skills folder not found: ${skillsDir}`];
  }

  const skills = await listSkills(skillsDir);
  return validateSkills(skills);
}
