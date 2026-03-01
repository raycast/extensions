import { promises as fs } from "fs";
import { homedir } from "os";
import path from "path";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  centralSkillsFolder: string;
  codexSkillsFolder: string;
}

export interface SkillFolder {
  name: string;
  path: string;
  hasSkillMd: boolean;
  description?: string;
}

export interface AgentSkillsTarget {
  id: string;
  label: string;
  skillsPath: string;
  installed: boolean;
  rootPath: string;
}

interface AgentSkillCandidate {
  id: string;
  label: string;
  rootPath: string;
}

const AGENT_SKILLS_TARGETS: AgentSkillCandidate[] = [
  { id: "codex", label: "Codex", rootPath: "~/.codex" },
  { id: "claude", label: "Claude", rootPath: "~/.claude" },
  { id: "cursor", label: "Cursor", rootPath: "~/.cursor" },
  { id: "vscode", label: "VS Code", rootPath: "~/.vscode" },
  { id: "warp", label: "Warp", rootPath: "~/.warp" },
];

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function normalizeName(name: string): string {
  return name.toLowerCase();
}

async function resolveComparablePath(p: string): Promise<string> {
  try {
    return await fs.realpath(p);
  } catch {
    return path.resolve(p);
  }
}

async function isAgentSkillSyncedToCentral(agentSkillPath: string, centralSkillPath: string): Promise<boolean> {
  const expected = await resolveComparablePath(centralSkillPath);
  try {
    const stats = await fs.lstat(agentSkillPath);
    if (stats.isSymbolicLink()) {
      const linkTarget = await fs.readlink(agentSkillPath);
      const resolvedLinkTarget = path.resolve(path.dirname(agentSkillPath), linkTarget);
      const resolved = await resolveComparablePath(resolvedLinkTarget);
      return resolved === expected;
    }

    const resolved = await resolveComparablePath(agentSkillPath);
    return resolved === expected;
  } catch {
    return false;
  }
}

export async function detectAgentSkillsTargets(): Promise<AgentSkillsTarget[]> {
  const targets: AgentSkillsTarget[] = [];
  const codexSkillsPath = getCodexSkillsPath();

  for (const candidate of AGENT_SKILLS_TARGETS) {
    const resolvedRootPath = expandPath(candidate.rootPath);
    const rootPath = candidate.id === "codex" ? path.dirname(codexSkillsPath) : resolvedRootPath;
    const skillsPath = candidate.id === "codex" ? codexSkillsPath : path.join(rootPath, "skills");
    const installed = candidate.id === "codex" ? true : await pathExists(rootPath);

    targets.push({
      id: candidate.id,
      label: candidate.label,
      skillsPath,
      installed,
      rootPath,
    });
  }

  return targets;
}

export interface AgentSyncResult {
  linked: number;
  skipped: number;
  errors: string[];
}

export interface ImportFromAgentsResult {
  imported: number;
  updated: number;
  scanned: number;
  errors: string[];
  byAgent: Record<string, number>;
}

interface ImportFromAgentsOptions {
  targets?: AgentSkillsTarget[];
  updateExisting?: boolean;
}

export interface AgentSkillsSyncStatus {
  target: AgentSkillsTarget;
  centralSkills: number;
  agentSkills: number;
  syncedFromCentral: number;
  missingFromAgent: number;
  extraInAgent: number;
  syncedSkillNames: string[];
  missingSkillNames: string[];
  extraSkillNames: string[];
}

/**
 * Resolve and expand home directory in path
 */
export function expandPath(p: string): string {
  return path.resolve(p.replace(/^~/, homedir()));
}

/**
 * Get the central skills folder path
 */
export function getCentralSkillsPath(): string {
  const { centralSkillsFolder } = getPreferenceValues<Preferences>();
  return expandPath(centralSkillsFolder);
}

/**
 * Get the codex skills folder path
 */
export function getCodexSkillsPath(): string {
  const { codexSkillsFolder } = getPreferenceValues<Preferences>();
  return expandPath(codexSkillsFolder);
}

/**
 * Ensure the central skills folder exists
 */
export async function ensureCentralSkillsFolder(): Promise<void> {
  const centralPath = getCentralSkillsPath();
  await fs.mkdir(centralPath, { recursive: true });
}

/**
 * List all skill folders in a directory
 */
export async function listSkillFolders(dir: string): Promise<SkillFolder[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const folders: SkillFolder[] = [];

    for (const entry of entries) {
      if ((entry.isDirectory() || entry.isSymbolicLink()) && !entry.name.startsWith(".")) {
        const folderPath = path.join(dir, entry.name);

        // Skip entries that resolve to non-directories (e.g. broken symlinks or file links)
        try {
          const stat = await fs.stat(folderPath);
          if (!stat.isDirectory()) {
            continue;
          }
        } catch {
          continue;
        }

        const skillMdPath = path.join(folderPath, "SKILL.md");
        let hasSkillMd = false;
        let description: string | undefined;

        try {
          await fs.access(skillMdPath);
          hasSkillMd = true;

          // Try to extract description from SKILL.md
          const content = await fs.readFile(skillMdPath, "utf8");
          const lines = content.split("\n");
          for (const line of lines) {
            if (line.trim() && !line.startsWith("#") && !line.startsWith("---")) {
              description = line.trim();
              break;
            }
          }
        } catch {
          // No SKILL.md file
        }

        folders.push({
          name: entry.name,
          path: folderPath,
          hasSkillMd,
          description,
        });
      }
    }

    return folders.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

/**
 * Copy a skill folder from source to destination
 */
export async function copySkillFolder(source: string, dest: string, overwriteExisting = false): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copySkillFolder(srcPath, destPath, overwriteExisting);
      continue;
    }

    if (!overwriteExisting) {
      try {
        await fs.access(destPath);
        continue;
      } catch {
        // Destination file doesn't exist, safe to copy
      }
    }

    if (entry.isSymbolicLink()) {
      try {
        const linkTarget = await fs.readlink(srcPath);
        await fs.rm(destPath, { recursive: true, force: true });
        await fs.symlink(linkTarget, destPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
          throw err;
        }
      }
      continue;
    }

    try {
      await fs.copyFile(srcPath, destPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  }
}

/**
 * Create or update a symlink
 */
export async function createSymlink(target: string, linkPath: string): Promise<void> {
  try {
    // Check if link already exists
    const stats = await fs.lstat(linkPath);
    if (stats.isSymbolicLink()) {
      const currentTarget = await fs.readlink(linkPath);
      if (currentTarget === target) {
        return; // Already pointing to correct target
      }
      await fs.unlink(linkPath);
    } else {
      // Path exists but is not a symlink, remove it
      await fs.rm(linkPath, { recursive: true, force: true });
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  // Create parent directory if needed
  await fs.mkdir(path.dirname(linkPath), { recursive: true });
  await fs.symlink(target, linkPath);
}

/**
 * Keep selected skills in the central folder and sync them as symlinks into all selected agent skill folders.
 */
export async function syncSelectedSkillsToAgents(
  selectedSkillNames: string[],
  selectedTargets: AgentSkillsTarget[],
): Promise<AgentSyncResult> {
  const centralPath = getCentralSkillsPath();
  await ensureCentralSkillsFolder();

  const centralSkills = await listSkillFolders(centralPath);
  const centralSkillMap = new Map(centralSkills.map((skill) => [skill.name, skill]));

  let linked = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const skillName of selectedSkillNames) {
    const centralSkill = centralSkillMap.get(skillName);
    if (!centralSkill || !centralSkill.hasSkillMd) {
      skipped++;
      if (!centralSkill) {
        errors.push(`${skillName}: not found in central folder`);
      } else {
        errors.push(`${skillName}: folder exists but missing SKILL.md`);
      }
      continue;
    }

    for (const target of selectedTargets) {
      if (!target.installed) {
        skipped++;
        continue;
      }

      try {
        const linkPath = path.join(target.skillsPath, skillName);
        await createSymlink(centralSkill.path, linkPath);
        linked++;
      } catch (err) {
        errors.push(`${skillName} -> ${target.label}: ${String(err)}`);
      }
    }
  }

  return { linked, skipped, errors };
}

/**
 * Import missing skills from detected installed agents into central folder.
 * Central folder remains source of truth after this bootstrap/merge step.
 */
export async function importMissingSkillsFromAgents(
  options: ImportFromAgentsOptions = {},
): Promise<ImportFromAgentsResult> {
  const { targets: targetsInput, updateExisting = false } = options;
  const centralPath = getCentralSkillsPath();
  await ensureCentralSkillsFolder();

  const targets = (targetsInput ?? (await detectAgentSkillsTargets()))
    .filter((target) => target.installed)
    .sort((a, b) => {
      if (a.id === "codex") return -1;
      if (b.id === "codex") return 1;
      return a.label.localeCompare(b.label);
    });
  const centralSkills = await listSkillFolders(centralPath);
  const centralSkillMap = new Map(centralSkills.map((skill) => [normalizeName(skill.name), skill]));

  let imported = 0;
  let updated = 0;
  let scanned = 0;
  const errors: string[] = [];
  const byAgent: Record<string, number> = {};

  for (const target of targets) {
    let mergedForAgent = 0;
    const sourceSkills = await listSkillFolders(target.skillsPath);

    for (const sourceSkill of sourceSkills) {
      scanned++;
      if (!sourceSkill.hasSkillMd) {
        continue;
      }

      const key = normalizeName(sourceSkill.name);
      const centralSkill = centralSkillMap.get(key);
      if (centralSkill?.hasSkillMd && !updateExisting) {
        continue;
      }

      try {
        if (!centralSkill || !centralSkill.hasSkillMd) {
          const destinationName = centralSkill?.name ?? sourceSkill.name;
          const destination = path.join(centralPath, destinationName);
          await copySkillFolder(sourceSkill.path, destination, true);
          imported++;
          mergedForAgent += 1;
          centralSkillMap.set(key, { name: destinationName, path: destination, hasSkillMd: true });
          continue;
        }

        const alreadySynced = await isAgentSkillSyncedToCentral(sourceSkill.path, centralSkill.path);
        if (alreadySynced) {
          continue;
        }

        await copySkillFolder(sourceSkill.path, centralSkill.path, true);
        updated++;
        mergedForAgent += 1;
      } catch (err) {
        errors.push(`${target.label}/${sourceSkill.name}: ${String(err)}`);
      }
    }

    byAgent[target.id] = mergedForAgent;
  }

  return { imported, updated, scanned, errors, byAgent };
}

/**
 * Build synchronization status for every detected agent target against central folder.
 */
export async function getAgentSkillsSyncStatus(targetsInput?: AgentSkillsTarget[]): Promise<AgentSkillsSyncStatus[]> {
  const targets = targetsInput ?? (await detectAgentSkillsTargets());
  const centralPath = getCentralSkillsPath();
  const centralSkills = (await listSkillFolders(centralPath)).filter((skill) => skill.hasSkillMd);
  const centralByName = new Map(centralSkills.map((skill) => [normalizeName(skill.name), skill]));

  const statuses: AgentSkillsSyncStatus[] = [];
  for (const target of targets) {
    if (!target.installed) {
      statuses.push({
        target,
        centralSkills: centralSkills.length,
        agentSkills: 0,
        syncedFromCentral: 0,
        missingFromAgent: centralSkills.length,
        extraInAgent: 0,
        syncedSkillNames: [],
        missingSkillNames: centralSkills.map((skill) => skill.name),
        extraSkillNames: [],
      });
      continue;
    }

    const agentSkills = (await listSkillFolders(target.skillsPath)).filter((skill) => skill.hasSkillMd);
    const agentByName = new Map(agentSkills.map((skill) => [normalizeName(skill.name), skill]));

    const syncedSkillNames: string[] = [];
    const missingSkillNames: string[] = [];
    const extraSkillNames: string[] = [];

    for (const centralSkill of centralSkills) {
      const agentSkill = agentByName.get(normalizeName(centralSkill.name));
      if (!agentSkill) {
        missingSkillNames.push(centralSkill.name);
        continue;
      }

      const isSynced = await isAgentSkillSyncedToCentral(agentSkill.path, centralSkill.path);
      if (isSynced) {
        syncedSkillNames.push(centralSkill.name);
      } else {
        missingSkillNames.push(centralSkill.name);
      }
    }

    for (const agentSkill of agentSkills) {
      if (!centralByName.has(normalizeName(agentSkill.name))) {
        extraSkillNames.push(agentSkill.name);
      }
    }

    statuses.push({
      target,
      centralSkills: centralSkills.length,
      agentSkills: agentSkills.length,
      syncedFromCentral: syncedSkillNames.length,
      missingFromAgent: missingSkillNames.length,
      extraInAgent: extraSkillNames.length,
      syncedSkillNames: syncedSkillNames.sort((a, b) => a.localeCompare(b)),
      missingSkillNames: missingSkillNames.sort((a, b) => a.localeCompare(b)),
      extraSkillNames: extraSkillNames.sort((a, b) => a.localeCompare(b)),
    });
  }

  return statuses;
}

/**
 * Sync skills from codex folder to central folder
 */
export async function syncFromCodexToCentral(): Promise<{ synced: number; errors: string[] }> {
  const codexPath = getCodexSkillsPath();
  const centralPath = getCentralSkillsPath();

  await ensureCentralSkillsFolder();

  const codexSkills = await listSkillFolders(codexPath);
  const centralSkills = await listSkillFolders(centralPath);
  const centralSkillMap = new Map(centralSkills.map((s) => [s.name, s]));

  let synced = 0;
  const errors: string[] = [];

  for (const skill of codexSkills) {
    const centralSkill = centralSkillMap.get(skill.name);
    const shouldMerge = !centralSkill || !centralSkill.hasSkillMd;

    if (skill.hasSkillMd && shouldMerge) {
      try {
        const destPath = path.join(centralPath, skill.name);
        await copySkillFolder(skill.path, destPath, false);
        synced++;
      } catch (err) {
        errors.push(`${skill.name}: ${String(err)}`);
      }
    }
  }

  return { synced, errors };
}

/**
 * Create symlinks from central folder to codex folder
 */
export async function createSymlinksToCodex(): Promise<{ linked: number; errors: string[] }> {
  const targets = await detectAgentSkillsTargets();
  const codexTarget = targets.find((target) => target.id === "codex");
  if (!codexTarget) return { linked: 0, errors: ["Could not resolve Codex skills path"] };

  const result = await syncSelectedSkillsToAgents(
    (await listSkillFolders(getCentralSkillsPath())).filter((skill) => skill.hasSkillMd).map((skill) => skill.name),
    [codexTarget],
  );

  return { linked: result.linked, errors: result.errors };
}
