import React, { useState, useEffect } from "react"
import { List, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api"
import { listInstalledSkills, removeSkillFromLock, addSkillToLock } from "../skill-registry"
import { detectInstalledAgents, getAgentConfig } from "../agents"
import { rm, lstat } from "fs/promises"
import { join } from "path"
import { sanitizeName, installSkillForAgent } from "../installer"
import { checkForUpdates } from "../update-detector"
import { cloneRepository, discoverSkills, cleanupTempDir, getLatestCommitHash } from "../repository-manager"
import type { InstalledSkill, AgentType, InstallMode } from "../types"

export default function ListInstalled() {
  const [skills, setSkills] = useState<InstalledSkill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchText, setSearchText] = useState("")
  const [checkingUpdates, setCheckingUpdates] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadInstalledSkills()
  }, [])

  async function loadInstalledSkills() {
    setIsLoading(true)
    try {
      const installed = await listInstalledSkills()

      // Check for updates for skills with source URLs
      const skillsWithUpdates = await Promise.all(
        installed.map(async (skill) => {
          if (!skill.sourceUrl) {
            return skill
          }

          try {
            const updateStatus = await checkForUpdates(skill.name, skill.sourceUrl, undefined, {
              global: skill.scope === "global",
            })
            return {
              ...skill,
              hasUpdate: updateStatus.hasUpdate,
            }
          } catch {
            return skill
          }
        })
      )

      setSkills(skillsWithUpdates)
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load installed skills",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function checkUpdateForSkill(skill: InstalledSkill) {
    if (!skill.sourceUrl) {
      showToast({
        style: Toast.Style.Failure,
        title: "No source URL",
        message: "Cannot check for updates without source URL",
      })
      return
    }

    setCheckingUpdates((prev) => new Set(prev).add(skill.name))

    try {
      const updateStatus = await checkForUpdates(skill.name, skill.sourceUrl, undefined, {
        global: skill.scope === "global",
      })

      if (updateStatus.hasUpdate) {
        showToast({
          style: Toast.Style.Success,
          title: "Update available",
          message: `New version of "${skill.name}" is available`,
        })
        await loadInstalledSkills() // Refresh to show update badge
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Up to date",
          message: `"${skill.name}" is already up to date`,
        })
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to check for updates",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setCheckingUpdates((prev) => {
        const next = new Set(prev)
        next.delete(skill.name)
        return next
      })
    }
  }

  async function deleteSkill(skill: InstalledSkill, agentType?: AgentType) {
    const confirmed = await confirmAlert({
      title: "Delete Skill",
      message: agentType
        ? `Remove "${skill.name}" from ${getAgentConfig(agentType).displayName}?`
        : `Remove "${skill.name}" from all agents?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    })

    if (!confirmed) {
      return
    }

    try {
      const agentsToDelete = agentType ? [agentType] : skill.agents
      const detectedAgents = await detectInstalledAgents()

      for (const agent of agentsToDelete) {
        if (!detectedAgents.includes(agent)) {
          continue
        }

        const agentConfig = getAgentConfig(agent)
        const scope = skill.scope
        const agentBase = scope === "global" ? agentConfig.globalSkillsDir : join(process.cwd(), agentConfig.skillsDir)

        if (!agentBase) {
          continue
        }

        const sanitizedName = sanitizeName(skill.name)
        const agentSkillDir = join(agentBase, sanitizedName)

        try {
          await rm(agentSkillDir, { recursive: true, force: true })
        } catch {
          // Ignore errors
        }
      }

      // If deleting from all agents, remove canonical location and lock file entry
      if (!agentType) {
        try {
          await rm(skill.canonicalPath, { recursive: true, force: true })
        } catch {
          // Ignore errors
        }

        // Remove from lock file
        try {
          await removeSkillFromLock(skill.name)
        } catch {
          // Ignore errors
        }
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Skill deleted",
      })

      await loadInstalledSkills()
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete skill",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  function getAgentDisplayNames(agentTypes: AgentType[]): string {
    if (agentTypes.length === 0) {
      return "No agents"
    }
    return agentTypes.map((type) => getAgentConfig(type).displayName).join(", ")
  }

  function formatDate(dateString?: string): string {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString()
    } catch {
      return ""
    }
  }

  async function reinstallSkill(skill: InstalledSkill) {
    if (!skill.sourceUrl) {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot reinstall",
        message: "Source URL not found. Please install from browse skills.",
      })
      return
    }

    if (skill.agents.length === 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "No agents",
        message: "This skill is not installed to any agents.",
      })
      return
    }

    const confirmed = await confirmAlert({
      title: "Reinstall Skill",
      message: `Reinstall "${skill.name}" to ${skill.agents.length} agent(s)?`,
      primaryAction: {
        title: "Reinstall",
      },
    })

    if (!confirmed) {
      return
    }

    let tempDir: string | null = null

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Reinstalling...",
        message: `Installing "${skill.name}"`,
      })

      // Clone repository
      tempDir = await cloneRepository(skill.sourceUrl)

      // Discover skills
      const discovered = await discoverSkills(tempDir)
      const skillToInstall = discovered.find((s) => s.name === skill.name)

      if (!skillToInstall) {
        throw new Error(`Skill "${skill.name}" not found in repository`)
      }

      // Detect installation mode (symlink or copy) by checking if agent directory is a symlink
      let installMode: InstallMode = "symlink"
      if (skill.agents.length > 0) {
        try {
          const firstAgent = skill.agents[0]
          const agentConfig = getAgentConfig(firstAgent)
          const agentBase =
            skill.scope === "global" ? agentConfig.globalSkillsDir : join(process.cwd(), agentConfig.skillsDir)

          if (agentBase) {
            const agentSkillDir = join(agentBase, sanitizeName(skill.name))
            try {
              const stats = await lstat(agentSkillDir)
              if (stats.isSymbolicLink()) {
                installMode = "symlink"
              } else {
                installMode = "copy"
              }
            } catch {
              // Default to symlink if we can't determine
              installMode = "symlink"
            }
          }
        } catch {
          // Default to symlink
          installMode = "symlink"
        }
      }

      // Install to each agent
      const cwd = process.cwd()
      const results = await Promise.all(
        skill.agents.map(async (agentType) => {
          const result = await installSkillForAgent(skillToInstall, agentType, {
            global: skill.scope === "global",
            cwd: skill.scope === "project" ? cwd : undefined,
            mode: installMode,
          })
          return { agentType, result }
        })
      )

      const failed = results.filter((r) => !r.result.success)
      if (failed.length > 0) {
        const failedAgents = failed.map((f) => getAgentConfig(f.agentType).displayName).join(", ")
        throw new Error(`Failed to reinstall to: ${failedAgents}`)
      }

      // Update lock file
      const sanitizedName = sanitizeName(skill.name)
      const gitCommitHash = await getLatestCommitHash(tempDir)
      if (!gitCommitHash) {
        // Warn but don't fail - reinstallation can proceed without commit hash
        showToast({
          style: Toast.Style.Failure,
          title: "Warning",
          message: "Could not retrieve commit hash. Update detection may not work.",
        })
      }
      await addSkillToLock(sanitizedName, {
        source: skill.sourceUrl,
        sourceType: "github",
        sourceUrl: skill.sourceUrl,
        gitCommitHash: gitCommitHash || undefined,
      })

      showToast({
        style: Toast.Style.Success,
        title: "Skill reinstalled",
        message: `Reinstalled to ${skill.agents.length} agent(s)`,
      })

      // Refresh the list
      await loadInstalledSkills()
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Reinstall failed",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      if (tempDir) {
        await cleanupTempDir(tempDir).catch(() => {
          // Ignore cleanup errors
        })
      }
    }
  }

  function handleReinstall(skill: InstalledSkill) {
    if (!skill.sourceUrl) {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot reinstall",
        message: "Source URL not found. Please install from browse skills.",
      })
      return
    }

    // Use direct reinstall for quick reinstall, or InstallFlow for full control
    reinstallSkill(skill)
  }

  const filteredSkills = skills.filter((skill) => {
    if (!searchText) return true
    const search = searchText.toLowerCase()
    return (
      skill.name.toLowerCase().includes(search) ||
      skill.description.toLowerCase().includes(search) ||
      getAgentDisplayNames(skill.agents).toLowerCase().includes(search) ||
      skill.scope.toLowerCase().includes(search)
    )
  })

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search installed skills..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {filteredSkills.length === 0 && !isLoading && (
        <List.EmptyView
          title={searchText ? "No skills found" : "No installed skills"}
          description={searchText ? "Try a different search term" : "Browse skills to install your first skill"}
        />
      )}
      {filteredSkills.map((skill) => {
        const accessories = []

        // Add update badge
        if (skill.hasUpdate) {
          accessories.push({ icon: Icon.ArrowClockwise, text: "Update available" })
        }

        // Add scope
        accessories.push({ text: skill.scope })

        // Add agents
        const agentText = getAgentDisplayNames(skill.agents)
        if (agentText) {
          accessories.push({ text: agentText })
        }

        // Add date if available
        if (skill.updatedAt) {
          accessories.push({ text: `Updated: ${formatDate(skill.updatedAt)}` })
        }

        const isCheckingUpdate = checkingUpdates.has(skill.name)

        return (
          <List.Item
            key={`${skill.scope}-${skill.name}`}
            title={skill.name}
            subtitle={skill.description}
            accessories={accessories}
            actions={
              <ActionPanel>
                {skill.sourceUrl && (
                  <Action title="Reinstall" icon={Icon.ArrowClockwise} onAction={() => handleReinstall(skill)} />
                )}
                {skill.sourceUrl && !isCheckingUpdate && (
                  <Action
                    title="Check for Updates"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => checkUpdateForSkill(skill)}
                  />
                )}
                {skill.sourceUrl && (
                  <Action.OpenInBrowser title="Open Repository" url={skill.sourceUrl} icon={Icon.Globe} />
                )}
                <Action
                  title="Delete from All Agents"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteSkill(skill)}
                />
                {skill.agents.map((agentType) => (
                  <Action
                    key={agentType}
                    title={`Delete from ${getAgentConfig(agentType).displayName}`}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => deleteSkill(skill, agentType)}
                  />
                ))}
              </ActionPanel>
            }
          />
        )
      })}
    </List>
  )
}
