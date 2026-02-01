import { mkdir, cp, access, readdir, symlink, lstat, rm, readlink } from "fs/promises"
import { join, basename, normalize, resolve, sep, relative, dirname } from "path"
import { homedir, platform } from "os"
import type { AgentType, InstallMode, InstallResult } from "./types"
import { agents } from "./agents"
import { AGENTS_DIR, SKILLS_SUBDIR } from "./constants"
import type { DiscoveredSkill } from "./repository-manager"

export function sanitizeName(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")

  return sanitized.substring(0, 255) || "unnamed-skill"
}

function isPathSafe(basePath: string, targetPath: string): boolean {
  const normalizedBase = normalize(resolve(basePath))
  const normalizedTarget = normalize(resolve(targetPath))

  return normalizedTarget.startsWith(normalizedBase + sep) || normalizedTarget === normalizedBase
}

export function getCanonicalSkillsDir(global: boolean, cwd?: string): string {
  const baseDir = global ? homedir() : cwd || process.cwd()
  return join(baseDir, AGENTS_DIR, SKILLS_SUBDIR)
}

function resolveSymlinkTarget(linkPath: string, linkTarget: string): string {
  return resolve(dirname(linkPath), linkTarget)
}

async function cleanAndCreateDirectory(path: string): Promise<void> {
  try {
    await rm(path, { recursive: true, force: true })
  } catch {
    // Ignore cleanup errors
  }
  await mkdir(path, { recursive: true })
}

async function createSymlink(target: string, linkPath: string): Promise<boolean> {
  try {
    const resolvedTarget = resolve(target)
    const resolvedLinkPath = resolve(linkPath)

    if (resolvedTarget === resolvedLinkPath) {
      return true
    }

    try {
      const stats = await lstat(linkPath)
      if (stats.isSymbolicLink()) {
        const existingTarget = await readlink(linkPath)
        if (resolveSymlinkTarget(linkPath, existingTarget) === resolvedTarget) {
          return true
        }
        await rm(linkPath)
      } else {
        await rm(linkPath, { recursive: true })
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "ELOOP") {
        try {
          await rm(linkPath, { force: true })
        } catch {
          // Continue to symlink creation
        }
      }
    }

    const linkDir = dirname(linkPath)
    await mkdir(linkDir, { recursive: true })

    const relativePath = relative(linkDir, target)
    const symlinkType = platform() === "win32" ? "junction" : undefined

    await symlink(relativePath, linkPath, symlinkType)
    return true
  } catch {
    return false
  }
}

const EXCLUDE_FILES = new Set(["README.md", "metadata.json"])
const EXCLUDE_DIRS = new Set([".git"])

const isExcluded = (name: string, isDirectory = false): boolean => {
  if (EXCLUDE_FILES.has(name)) return true
  if (name.startsWith("_")) return true
  if (isDirectory && EXCLUDE_DIRS.has(name)) return true
  return false
}

async function copyDirectory(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true })

  const entries = await readdir(src, { withFileTypes: true })

  await Promise.all(
    entries
      .filter((entry) => !isExcluded(entry.name, entry.isDirectory()))
      .map(async (entry) => {
        const srcPath = join(src, entry.name)
        const destPath = join(dest, entry.name)

        if (entry.isDirectory()) {
          await copyDirectory(srcPath, destPath)
        } else {
          await cp(srcPath, destPath, {
            dereference: true,
            recursive: true,
          })
        }
      })
  )
}

export async function installSkillForAgent(
  skill: DiscoveredSkill,
  agentType: AgentType,
  options: { global?: boolean; cwd?: string; mode?: InstallMode } = {}
): Promise<InstallResult> {
  const agent = agents[agentType]
  const isGlobal = options.global ?? false
  const cwd = options.cwd || process.cwd()

  if (isGlobal && agent.globalSkillsDir === undefined) {
    return {
      success: false,
      path: "",
      mode: options.mode ?? "symlink",
      error: `${agent.displayName} does not support global skill installation`,
    }
  }

  const rawSkillName = skill.name || basename(skill.path)
  const skillName = sanitizeName(rawSkillName)

  const canonicalBase = getCanonicalSkillsDir(isGlobal, cwd)
  const canonicalDir = join(canonicalBase, skillName)

  const agentBase = isGlobal && agent.globalSkillsDir ? agent.globalSkillsDir : join(cwd, agent.skillsDir)
  const agentDir = join(agentBase, skillName)

  const installMode = options.mode ?? "symlink"

  if (!isPathSafe(canonicalBase, canonicalDir)) {
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: "Invalid skill name: potential path traversal detected",
    }
  }

  if (!isPathSafe(agentBase, agentDir)) {
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: "Invalid skill name: potential path traversal detected",
    }
  }

  try {
    if (installMode === "copy") {
      await cleanAndCreateDirectory(agentDir)
      await copyDirectory(skill.path, agentDir)

      return {
        success: true,
        path: agentDir,
        mode: "copy",
      }
    }

    await cleanAndCreateDirectory(canonicalDir)
    await copyDirectory(skill.path, canonicalDir)

    const symlinkCreated = await createSymlink(canonicalDir, agentDir)

    if (!symlinkCreated) {
      await cleanAndCreateDirectory(agentDir)
      await copyDirectory(skill.path, agentDir)

      return {
        success: true,
        path: agentDir,
        canonicalPath: canonicalDir,
        mode: "symlink",
        symlinkFailed: true,
      }
    }

    return {
      success: true,
      path: agentDir,
      canonicalPath: canonicalDir,
      mode: "symlink",
    }
  } catch (error) {
    return {
      success: false,
      path: agentDir,
      mode: installMode,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function isSkillInstalled(
  skillName: string,
  agentType: AgentType,
  options: { global?: boolean; cwd?: string } = {}
): Promise<boolean> {
  const agent = agents[agentType]
  const sanitized = sanitizeName(skillName)

  if (options.global && agent.globalSkillsDir === undefined) {
    return false
  }

  const targetBase =
    options.global && agent.globalSkillsDir
      ? agent.globalSkillsDir
      : join(options.cwd || process.cwd(), agent.skillsDir)

  const skillDir = join(targetBase, sanitized)

  if (!isPathSafe(targetBase, skillDir)) {
    return false
  }

  try {
    await access(skillDir)
    return true
  } catch {
    return false
  }
}

export function getInstallPath(
  skillName: string,
  agentType: AgentType,
  options: { global?: boolean; cwd?: string } = {}
): string {
  const agent = agents[agentType]
  const cwd = options.cwd || process.cwd()
  const sanitized = sanitizeName(skillName)

  const targetBase =
    options.global && agent.globalSkillsDir !== undefined ? agent.globalSkillsDir : join(cwd, agent.skillsDir)

  const installPath = join(targetBase, sanitized)

  if (!isPathSafe(targetBase, installPath)) {
    throw new Error("Invalid skill name: potential path traversal detected")
  }

  return installPath
}

export function getCanonicalPath(skillName: string, options: { global?: boolean; cwd?: string } = {}): string {
  const sanitized = sanitizeName(skillName)
  const canonicalBase = getCanonicalSkillsDir(options.global ?? false, options.cwd)
  const canonicalPath = join(canonicalBase, sanitized)

  if (!isPathSafe(canonicalBase, canonicalPath)) {
    throw new Error("Invalid skill name: potential path traversal detected")
  }

  return canonicalPath
}
