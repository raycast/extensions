import type { SkillInstallState } from "./types"
import { getRemoteCommitHash } from "./repository-manager"
import { getSkillLockEntry } from "./skill-registry"

export interface UpdateStatus {
  skillName: string
  hasUpdate: boolean
  updateType: "content" | "git" | "none"
  localHash: string
  remoteHash: string
  gitCommitDiff?: string
}

/**
 * Get the installed Git commit hash for a skill from the lock file
 */
export async function getInstalledCommitHash(skillName: string): Promise<string | null> {
  try {
    const lockEntry = await getSkillLockEntry(skillName)
    return lockEntry?.gitCommitHash || null
  } catch {
    return null
  }
}

/**
 * Get the latest Git commit hash from a remote repository
 */
export async function getRemoteCommitHashForSkill(sourceUrl: string, _skillPath?: string): Promise<string | null> {
  try {
    return await getRemoteCommitHash(sourceUrl)
  } catch {
    return null
  }
}

/**
 * Check if a skill has updates available using Git commit hashes
 */
export async function checkForUpdates(
  skillName: string,
  sourceUrl: string,
  _skillPath?: string,
  _options?: { global?: boolean; cwd?: string }
): Promise<UpdateStatus> {
  const localCommitHash = await getInstalledCommitHash(skillName)
  const remoteCommitHash = await getRemoteCommitHashForSkill(sourceUrl, _skillPath)

  if (!localCommitHash || !remoteCommitHash) {
    return {
      skillName,
      hasUpdate: false,
      updateType: "none",
      localHash: localCommitHash || "",
      remoteHash: remoteCommitHash || "",
    }
  }

  const hasUpdate = localCommitHash !== remoteCommitHash

  return {
    skillName,
    hasUpdate,
    updateType: hasUpdate ? "git" : "none",
    localHash: localCommitHash,
    remoteHash: remoteCommitHash,
  }
}

/**
 * Get install state for a skill
 */
export async function getSkillInstallState(
  skillName: string,
  sourceUrl: string,
  _skillPath?: string,
  _options?: { global?: boolean; cwd?: string }
): Promise<SkillInstallState> {
  const localCommitHash = await getInstalledCommitHash(skillName)

  // If no local commit hash is stored, we can't determine update status
  // Check if skill is actually installed by looking at the file system
  if (!localCommitHash) {
    // For now, return 'installed' if we can't determine update status
    // The caller will populate installedAgents from the installed skills list
    return {
      status: "installed",
      installedAgents: [],
    }
  }

  const remoteCommitHash = await getRemoteCommitHashForSkill(sourceUrl, _skillPath)

  // If we can't get remote hash, assume installed (no update check possible)
  if (!remoteCommitHash) {
    return {
      status: "installed",
      installedAgents: [], // Will be populated by caller
      localHash: localCommitHash,
      remoteHash: undefined,
    }
  }

  // Compare commit hashes - if they match, skill is up to date
  if (localCommitHash === remoteCommitHash) {
    return {
      status: "installed",
      installedAgents: [], // Will be populated by caller
      localHash: localCommitHash,
      remoteHash: remoteCommitHash,
    }
  }

  // Commit hashes differ - update available
  return {
    status: "update_available",
    installedAgents: [], // Will be populated by caller
    localHash: localCommitHash,
    remoteHash: remoteCommitHash,
  }
}
