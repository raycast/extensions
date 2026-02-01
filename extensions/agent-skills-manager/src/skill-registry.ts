import { readFile, writeFile, mkdir, readdir, stat } from "fs/promises"
import { join, dirname } from "path"
import { homedir } from "os"
import { createHash } from "crypto"
import { AGENTS_DIR, LOCK_FILE } from "./constants"
import { getCanonicalSkillsDir } from "./installer"
import { detectInstalledAgents, agents } from "./agents"
import type { AgentType, InstalledSkill } from "./types"
import { sanitizeName } from "./installer"
import matter from "gray-matter"

const CURRENT_VERSION = 3

export interface SkillLockEntry {
  source: string
  sourceType: string
  sourceUrl: string
  skillPath?: string
  skillFolderHash?: string // Deprecated, kept for backward compatibility
  gitCommitHash?: string // Git commit hash of the installed version
  installedAt: string
  updatedAt: string
}

export interface SkillLockFile {
  version: number
  skills: Record<string, SkillLockEntry>
  dismissed?: {
    findSkillsPrompt?: boolean
  }
  lastSelectedAgents?: string[]
}

export function getSkillLockPath(): string {
  return join(homedir(), AGENTS_DIR, LOCK_FILE)
}

export async function readSkillLock(): Promise<SkillLockFile> {
  const lockPath = getSkillLockPath()

  try {
    const content = await readFile(lockPath, "utf-8")
    const parsed = JSON.parse(content) as SkillLockFile

    if (typeof parsed.version !== "number" || !parsed.skills) {
      return createEmptyLockFile()
    }

    if (parsed.version < CURRENT_VERSION) {
      return createEmptyLockFile()
    }

    return parsed
  } catch {
    return createEmptyLockFile()
  }
}

export async function writeSkillLock(lock: SkillLockFile): Promise<void> {
  const lockPath = getSkillLockPath()
  await mkdir(dirname(lockPath), { recursive: true })
  const content = JSON.stringify(lock, null, 2)
  await writeFile(lockPath, content, "utf-8")
}

export function computeContentHash(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex")
}

function createEmptyLockFile(): SkillLockFile {
  return {
    version: CURRENT_VERSION,
    skills: {},
  }
}

export async function addSkillToLock(
  skillName: string,
  metadata: {
    source: string
    sourceType: string
    sourceUrl: string
    skillPath?: string
    skillFolderHash?: string // Deprecated, kept for backward compatibility
    gitCommitHash?: string // Git commit hash of the installed version
  }
): Promise<void> {
  const lock = await readSkillLock()
  const now = new Date().toISOString()

  lock.skills[skillName] = {
    ...metadata,
    installedAt: lock.skills[skillName]?.installedAt || now,
    updatedAt: now,
  }

  await writeSkillLock(lock)
}

export async function getLastSelectedAgents(): Promise<string[] | undefined> {
  const lock = await readSkillLock()
  return lock.lastSelectedAgents
}

export async function saveSelectedAgents(agentTypes: string[]): Promise<void> {
  const lock = await readSkillLock()
  lock.lastSelectedAgents = agentTypes
  await writeSkillLock(lock)
}

export async function getSkillLockEntry(skillName: string): Promise<SkillLockEntry | null> {
  const lock = await readSkillLock()
  const sanitized = sanitizeName(skillName)
  return lock.skills[sanitized] || null
}

export async function removeSkillFromLock(skillName: string): Promise<void> {
  const lock = await readSkillLock()
  const sanitized = sanitizeName(skillName)
  delete lock.skills[sanitized]
  await writeSkillLock(lock)
}

async function parseSkillMd(skillMdPath: string): Promise<{ name: string; description: string } | null> {
  try {
    const content = await readFile(skillMdPath, "utf-8")
    const { data } = matter(content)

    if (!data.name || !data.description) {
      return null
    }

    return {
      name: data.name,
      description: data.description,
    }
  } catch {
    return null
  }
}

function isPathSafe(basePath: string, targetPath: string): boolean {
  const normalizedBase = basePath.replace(/\\/g, "/")
  const normalizedTarget = targetPath.replace(/\\/g, "/")
  return normalizedTarget.startsWith(normalizedBase + "/") || normalizedTarget === normalizedBase
}

export async function listInstalledSkills(
  options: {
    global?: boolean
    cwd?: string
    agentFilter?: AgentType[]
  } = {}
): Promise<InstalledSkill[]> {
  const cwd = options.cwd || process.cwd()
  const installedSkills: InstalledSkill[] = []
  const scopes: Array<{ global: boolean; path: string }> = []

  const detectedAgents = await detectInstalledAgents()

  if (options.global === undefined) {
    scopes.push({ global: false, path: getCanonicalSkillsDir(false, cwd) })
    scopes.push({ global: true, path: getCanonicalSkillsDir(true, cwd) })
  } else {
    scopes.push({ global: options.global, path: getCanonicalSkillsDir(options.global, cwd) })
  }

  for (const scope of scopes) {
    try {
      const entries = await readdir(scope.path, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue
        }

        const skillDir = join(scope.path, entry.name)
        const skillMdPath = join(skillDir, "SKILL.md")

        try {
          await stat(skillMdPath)
        } catch {
          continue
        }

        const skill = await parseSkillMd(skillMdPath)
        if (!skill) {
          continue
        }

        const sanitizedSkillName = sanitizeName(skill.name)
        const installedAgents: AgentType[] = []
        const agentFilter = options.agentFilter
        const agentsToCheck = agentFilter ? detectedAgents.filter((a) => agentFilter.includes(a)) : detectedAgents

        for (const agentType of agentsToCheck) {
          const agent = agents[agentType]

          if (scope.global && agent.globalSkillsDir === undefined) {
            continue
          }

          const agentBase = scope.global && agent.globalSkillsDir ? agent.globalSkillsDir : join(cwd, agent.skillsDir)

          let found = false

          const possibleNames = [
            entry.name,
            sanitizedSkillName,
            skill.name
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[/\\:\0]/g, ""),
          ]
          const uniqueNames = Array.from(new Set(possibleNames))

          for (const possibleName of uniqueNames) {
            const agentSkillDir = join(agentBase, possibleName)

            if (!isPathSafe(agentBase, agentSkillDir)) {
              continue
            }

            try {
              await stat(agentSkillDir)
              found = true
              break
            } catch {
              // Try next name
            }
          }

          if (!found) {
            try {
              const agentEntries = await readdir(agentBase, { withFileTypes: true })
              for (const agentEntry of agentEntries) {
                if (!agentEntry.isDirectory()) {
                  continue
                }

                const candidateDir = join(agentBase, agentEntry.name)
                if (!isPathSafe(agentBase, candidateDir)) {
                  continue
                }

                try {
                  const candidateSkillMd = join(candidateDir, "SKILL.md")
                  await stat(candidateSkillMd)
                  const candidateSkill = await parseSkillMd(candidateSkillMd)
                  if (candidateSkill && candidateSkill.name === skill.name) {
                    found = true
                    break
                  }
                } catch {
                  // Not a valid skill directory
                }
              }
            } catch {
              // Agent base directory doesn't exist
            }
          }

          if (found) {
            installedAgents.push(agentType)
          }
        }

        // Get lock file entry for this skill
        const lockEntry = await getSkillLockEntry(skill.name)

        installedSkills.push({
          name: skill.name,
          description: skill.description,
          path: skillDir,
          canonicalPath: skillDir,
          scope: scope.global ? "global" : "project",
          agents: installedAgents,
          sourceUrl: lockEntry?.sourceUrl,
          installedAt: lockEntry?.installedAt,
          updatedAt: lockEntry?.updatedAt,
        })
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  return installedSkills
}
