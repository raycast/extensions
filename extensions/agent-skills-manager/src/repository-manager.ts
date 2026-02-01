import simpleGit from "simple-git"
import { mkdtemp, rm, readdir, readFile, stat } from "fs/promises"
import { join, dirname } from "path"
import { tmpdir } from "os"
import matter from "gray-matter"

const CLONE_TIMEOUT_MS = 60000
const SKIP_DIRS = ["node_modules", ".git", "dist", "build", "__pycache__"]

export class GitCloneError extends Error {
  readonly url: string
  readonly isTimeout: boolean
  readonly isAuthError: boolean

  constructor(message: string, url: string, isTimeout = false, isAuthError = false) {
    super(message)
    this.name = "GitCloneError"
    this.url = url
    this.isTimeout = isTimeout
    this.isAuthError = isAuthError
  }
}

export interface DiscoveredSkill {
  name: string
  description: string
  path: string
  rawContent: string
  metadata?: Record<string, unknown>
}

/**
 * Clone a repository to a temporary directory
 */
export async function cloneRepository(url: string, ref?: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "skills-"))
  const git = simpleGit({ timeout: { block: CLONE_TIMEOUT_MS } })
  const cloneOptions = ref ? ["--depth", "1", "--branch", ref] : ["--depth", "1"]

  try {
    await git.clone(url, tempDir, cloneOptions)
    return tempDir
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {
      // Ignore cleanup errors
    })

    const errorMessage = error instanceof Error ? error.message : String(error)
    const isTimeout = errorMessage.includes("block timeout") || errorMessage.includes("timed out")
    const isAuthError =
      errorMessage.includes("Authentication failed") ||
      errorMessage.includes("could not read Username") ||
      errorMessage.includes("Permission denied") ||
      errorMessage.includes("Repository not found")

    if (isTimeout) {
      throw new GitCloneError(
        `Clone timed out after 60s. This often happens with private repos that require authentication.`,
        url,
        true,
        false
      )
    }

    if (isAuthError) {
      throw new GitCloneError(`Authentication failed for ${url}.`, url, false, true)
    }

    throw new GitCloneError(`Failed to clone ${url}: ${errorMessage}`, url, false, false)
  }
}

/**
 * Clean up a temporary directory
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  const normalizedDir = dir.replace(/\\/g, "/")
  const normalizedTmpDir = tmpdir().replace(/\\/g, "/")

  if (!normalizedDir.startsWith(normalizedTmpDir + "/") && normalizedDir !== normalizedTmpDir) {
    throw new Error("Attempted to clean up directory outside of temp directory")
  }

  await rm(dir, { recursive: true, force: true })
}

/**
 * Get the latest commit hash from a repository
 */
export async function getLatestCommitHash(repoPath: string, ref = "HEAD"): Promise<string | null> {
  try {
    const git = simpleGit(repoPath)

    // First, try to get the commit hash using revparse (most reliable)
    try {
      const hash = await git.revparse([ref])
      const trimmedHash = hash.trim()
      if (trimmedHash && trimmedHash.length > 0) {
        return trimmedHash
      }
    } catch (revparseError) {
      // Continue to fallback method
    }

    // Fallback to log method
    const log = await git.log({ maxCount: 1 })
    if (log.latest?.hash) {
      return log.latest.hash
    }

    // If log doesn't work, try getting all commits and take the first one
    const allLogs = await git.log()
    if (allLogs.latest?.hash) {
      return allLogs.latest.hash
    }

    return null
  } catch (error) {
    // Return null if all methods fail
    return null
  }
}

/**
 * Get the latest commit hash from a remote repository URL
 */
export async function getRemoteCommitHash(url: string, ref?: string): Promise<string | null> {
  let tempDir: string | null = null

  try {
    tempDir = await cloneRepository(url, ref)
    return await getLatestCommitHash(tempDir)
  } catch {
    return null
  } finally {
    if (tempDir) {
      await cleanupTempDir(tempDir).catch(() => {
        // Ignore cleanup errors
      })
    }
  }
}

async function hasSkillMd(dir: string): Promise<boolean> {
  try {
    const skillPath = join(dir, "SKILL.md")
    const stats = await stat(skillPath)
    return stats.isFile()
  } catch {
    return false
  }
}

async function parseSkillMd(skillMdPath: string): Promise<DiscoveredSkill | null> {
  try {
    const content = await readFile(skillMdPath, "utf-8")
    const { data } = matter(content)

    if (!data.name || !data.description) {
      return null
    }

    const isInternal = data.metadata?.internal === true
    if (isInternal && process.env.INSTALL_INTERNAL_SKILLS !== "1" && process.env.INSTALL_INTERNAL_SKILLS !== "true") {
      return null
    }

    return {
      name: data.name,
      description: data.description,
      path: dirname(skillMdPath),
      rawContent: content,
      metadata: data.metadata,
    }
  } catch {
    return null
  }
}

async function findSkillDirs(dir: string, depth = 0, maxDepth = 5): Promise<string[]> {
  if (depth > maxDepth) return []

  try {
    const [hasSkill, entries] = await Promise.all([
      hasSkillMd(dir),
      readdir(dir, { withFileTypes: true }).catch(() => []),
    ])

    const currentDir = hasSkill ? [dir] : []

    const subDirResults = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && !SKIP_DIRS.includes(entry.name))
        .map((entry) => findSkillDirs(join(dir, entry.name), depth + 1, maxDepth))
    )

    return [...currentDir, ...subDirResults.flat()]
  } catch {
    return []
  }
}

/**
 * Discover skills in a repository
 */
export async function discoverSkills(
  repoPath: string,
  subpath?: string,
  options?: { includeInternal?: boolean; fullDepth?: boolean }
): Promise<DiscoveredSkill[]> {
  const skills: DiscoveredSkill[] = []
  const seenNames = new Set<string>()
  const searchPath = subpath ? join(repoPath, subpath) : repoPath

  if (await hasSkillMd(searchPath)) {
    const skill = await parseSkillMd(join(searchPath, "SKILL.md"))
    if (skill) {
      skills.push(skill)
      seenNames.add(skill.name)
    }

    if (!options?.fullDepth) {
      return skills
    }
  }

  const skillDirs = await findSkillDirs(searchPath)

  for (const skillDir of skillDirs) {
    const skillMdPath = join(skillDir, "SKILL.md")
    const skill = await parseSkillMd(skillMdPath)

    if (skill && !seenNames.has(skill.name)) {
      skills.push(skill)
      seenNames.add(skill.name)
    }
  }

  return skills
}
