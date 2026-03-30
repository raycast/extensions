import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { SkillInfo, InstalledPluginsFile } from "../types";
import { readJsonFile } from "./fs-utils";

const HOME = os.homedir();
const SKILLS_DIR = path.join(HOME, ".claude", "skills");
const COMMANDS_DIR = path.join(HOME, ".claude", "commands");
const SETTINGS_PATH = path.join(HOME, ".claude", "settings.json");
const INSTALLED_PLUGINS_PATH = path.join(
  HOME,
  ".claude",
  "plugins",
  "installed_plugins.json",
);

function parseSkillFrontmatter(content: string): {
  name?: string;
  description?: string;
  userInvokable?: boolean;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, string | boolean> = {};

  for (const line of yaml.split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (kv) {
      const key = kv[1];
      let value: string | boolean = kv[2].trim();
      if (value === "true") value = true;
      else if (value === "false") value = false;
      result[key] = value;
    }
  }

  return {
    name: result.name as string | undefined,
    description: result.description as string | undefined,
    userInvokable:
      result["user-invokable"] === true || result["user-invocable"] === true,
  };
}

function loadUserSkills(): SkillInfo[] {
  if (!fs.existsSync(SKILLS_DIR)) return [];

  const entries = fs.readdirSync(SKILLS_DIR);
  const skills: SkillInfo[] = [];

  for (const entry of entries) {
    const fullPath = path.join(SKILLS_DIR, entry);
    const lstat = fs.lstatSync(fullPath);
    const isSymlink = lstat.isSymbolicLink();

    let symlinkTarget: string | undefined;
    let resolvedPath = fullPath;

    if (isSymlink) {
      try {
        symlinkTarget = fs.readlinkSync(fullPath);
        resolvedPath = path.resolve(SKILLS_DIR, symlinkTarget);
      } catch {
        continue;
      }
    }

    // Find SKILL.md
    let skillMdPath: string | null = null;
    const directSkillMd = path.join(resolvedPath, "SKILL.md");
    if (fs.existsSync(directSkillMd)) {
      skillMdPath = directSkillMd;
    } else {
      try {
        const subdirs = fs.readdirSync(resolvedPath);
        for (const sub of subdirs) {
          const subSkillMd = path.join(resolvedPath, sub, "SKILL.md");
          if (fs.existsSync(subSkillMd)) {
            skillMdPath = subSkillMd;
            break;
          }
        }
      } catch {
        /* not a directory */
      }
    }

    if (!skillMdPath) continue;

    try {
      const content = fs.readFileSync(skillMdPath, "utf-8");
      const meta = parseSkillFrontmatter(content);

      skills.push({
        name: meta.name || entry,
        description: meta.description || "",
        dirName: entry,
        path: fullPath,
        isSymlink,
        symlinkTarget,
        userInvokable: meta.userInvokable ?? false,
        source: "user",
      });
    } catch {
      continue;
    }
  }

  return skills;
}

function loadCommandSkills(): SkillInfo[] {
  if (!fs.existsSync(COMMANDS_DIR)) return [];

  const skills: SkillInfo[] = [];

  // Scan subdirectories (e.g., gsd/)
  for (const group of fs.readdirSync(COMMANDS_DIR)) {
    const groupPath = path.join(COMMANDS_DIR, group);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(groupPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;

    for (const file of fs.readdirSync(groupPath)) {
      if (!file.endsWith(".md")) continue;
      const filePath = path.join(groupPath, file);

      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const meta = parseSkillFrontmatter(content);
        const baseName = file.replace(/\.md$/, "");

        skills.push({
          name: meta.name || `${group}:${baseName}`,
          description: meta.description || "",
          dirName: `${group}/${file}`,
          path: filePath,
          isSymlink: false,
          userInvokable: true, // commands are always invokable
          source: "command",
        });
      } catch {
        continue;
      }
    }
  }

  return skills;
}

function loadPluginSkills(): SkillInfo[] {
  const settings = readJsonFile<Record<string, unknown>>(SETTINGS_PATH);
  const enabledPlugins =
    (settings?.enabledPlugins as Record<string, boolean>) ?? {};
  const installed = readJsonFile<InstalledPluginsFile>(INSTALLED_PLUGINS_PATH);
  if (!installed) return [];

  const skills: SkillInfo[] = [];

  for (const [key, enabled] of Object.entries(enabledPlugins)) {
    if (!enabled) continue;
    const installs = installed.plugins?.[key];
    if (!installs?.length) continue;

    const installPath = installs[0].installPath;
    const skillsDir = path.join(installPath, "skills");
    if (!fs.existsSync(skillsDir)) continue;

    const pluginName = key.split("@")[0];

    for (const entry of fs.readdirSync(skillsDir)) {
      const skillMdPath = path.join(skillsDir, entry, "SKILL.md");
      if (!fs.existsSync(skillMdPath)) continue;

      try {
        const content = fs.readFileSync(skillMdPath, "utf-8");
        const meta = parseSkillFrontmatter(content);

        skills.push({
          name: meta.name || entry,
          description: meta.description || "",
          dirName: entry,
          path: path.join(skillsDir, entry),
          isSymlink: false,
          userInvokable: meta.userInvokable ?? false,
          source: "plugin",
          pluginName,
        });
      } catch {
        continue;
      }
    }
  }

  return skills;
}

export async function loadAllSkills(): Promise<SkillInfo[]> {
  const skills = [
    ...loadUserSkills(),
    ...loadCommandSkills(),
    ...loadPluginSkills(),
  ];
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

export function uninstallSkill(dirName: string): void {
  if (!dirName || dirName === "." || dirName === "..") {
    throw new Error("Invalid skill path");
  }
  const fullPath = path.join(SKILLS_DIR, dirName);
  // Prevent path traversal
  if (!fullPath.startsWith(SKILLS_DIR + path.sep) && fullPath !== SKILLS_DIR) {
    throw new Error("Invalid skill path");
  }
  const lstat = fs.lstatSync(fullPath);

  if (lstat.isSymbolicLink()) {
    fs.unlinkSync(fullPath);
  } else {
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}
