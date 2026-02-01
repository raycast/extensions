import React, { useState, useEffect } from "react"
import { Detail, ActionPanel, Action, Icon, showToast, Toast, List, popToRoot } from "@raycast/api"
import { homedir } from "os"
import { getAllAgents, getAgentConfig } from "../agents"
import { cloneRepository, discoverSkills, cleanupTempDir, getLatestCommitHash } from "../repository-manager"
import { installSkillForAgent, sanitizeName, getCanonicalPath } from "../installer"
import { addSkillToLock, saveSelectedAgents } from "../skill-registry"
import type { AgentType, InstallMode } from "../types"
import type { DiscoveredSkill } from "../repository-manager"

const SKILLS_LOGO = `
███████╗██╗  ██╗██╗██╗     ██╗     ███████╗
██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝
███████╗█████╔╝ ██║██║     ██║     ███████╗
╚════██║██╔═██╗ ██║██║     ██║     ╚════██║
███████║██║  ██╗██║███████╗███████╗███████║
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝`

interface RepositoryMetadata {
  owner?: string
  repo?: string
  description?: string
  skills: DiscoveredSkill[]
}

interface InstallFlowState {
  step:
    | "metadata"
    | "skill-selection"
    | "agent-selection"
    | "scope-selection"
    | "method-selection"
    | "summary"
    | "installing"
  sourceUrl: string
  skillName?: string
  repositoryMetadata?: RepositoryMetadata
  discoveredSkills: DiscoveredSkill[]
  selectedSkills: DiscoveredSkill[]
  selectedAgents: AgentType[]
  scope: "global" // Project-level installation disabled
  method: InstallMode
  tempDir?: string
  isInstalling: boolean
}

export function InstallFlow({
  sourceUrl,
  skillName,
  onComplete,
}: {
  sourceUrl: string
  skillName?: string
  onComplete?: () => void
}) {
  const [state, setState] = useState<InstallFlowState>({
    step: "metadata",
    sourceUrl,
    skillName,
    discoveredSkills: [],
    selectedSkills: [],
    selectedAgents: [],
    scope: "global",
    method: "symlink",
    isInstalling: false,
  })

  useEffect(() => {
    loadRepositoryMetadata()
  }, [])

  async function loadRepositoryMetadata() {
    try {
      // Parse GitHub URL to get owner/repo
      const match = sourceUrl.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/)
      const owner = match?.[1]
      const repo = match?.[2]?.replace(".git", "")

      // Clone repository
      const tempDir = await cloneRepository(sourceUrl)
      setState((prev) => ({ ...prev, tempDir }))

      // Discover skills
      const discovered = await discoverSkills(tempDir)

      if (discovered.length === 0) {
        throw new Error("No skills found in repository")
      }

      // If skillName provided, filter to that skill
      let skillsToShow = discovered
      if (skillName) {
        const found = discovered.find(
          (s) => s.name.toLowerCase() === skillName.toLowerCase() || sanitizeName(s.name) === sanitizeName(skillName)
        )
        if (found) {
          skillsToShow = [found]
        }
      }

      // Fetch repository description from GitHub API if possible
      let description: string | undefined
      if (owner && repo) {
        try {
          const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
          if (response.ok) {
            const data = (await response.json()) as { description?: string }
            description = data.description || undefined
          }
        } catch {
          // Ignore API errors
        }
      }

      setState((prev) => ({
        ...prev,
        repositoryMetadata: {
          owner,
          repo,
          description,
          skills: skillsToShow,
        },
        discoveredSkills: discovered,
        selectedSkills: skillsToShow.length === 1 ? skillsToShow : [],
      }))
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load repository",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  function handleContinueToAgentSelection() {
    if (state.selectedSkills.length === 0 && state.discoveredSkills.length > 1) {
      // Need to select skills first
      setState((prev) => ({ ...prev, step: "skill-selection" }))
    } else {
      // Auto-select if single skill or already selected
      if (state.selectedSkills.length === 0 && state.discoveredSkills.length === 1) {
        setState((prev) => ({ ...prev, selectedSkills: state.discoveredSkills }))
      }
      setState((prev) => ({ ...prev, step: "agent-selection" }))
    }
  }

  function handleSkillSelection(selected: DiscoveredSkill[]) {
    setState((prev) => ({
      ...prev,
      selectedSkills: selected,
      step: "agent-selection",
    }))
  }

  function handleAgentSelection(agents: AgentType[]) {
    setState((prev) => ({
      ...prev,
      selectedAgents: agents,
      scope: "global", // Always use global installation
      step: "method-selection", // Skip scope selection, go directly to method selection
    }))
  }

  function handleMethodSelection(method: InstallMode) {
    setState((prev) => ({
      ...prev,
      method,
      step: "summary",
    }))
  }

  async function handleInstallation() {
    const { selectedSkills, selectedAgents, method, tempDir } = state

    if (!tempDir) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "Temporary directory not found" })
      return
    }

    if (selectedAgents.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "Please select at least one agent" })
      return
    }

    setState((prev) => ({ ...prev, isInstalling: true, step: "installing" }))

    try {
      const skill = selectedSkills[0] // Handle single skill for now
      // Always use global installation (project-level disabled)
      const results = await Promise.all(
        selectedAgents.map(async (agentType) => {
          const result = await installSkillForAgent(skill, agentType, {
            global: true,
            mode: method,
          })
          return { agentType, result }
        })
      )

      const successful = results.filter((r) => r.result.success)
      const failed = results.filter((r) => !r.result.success)

      // Show detailed error messages for failed installations
      if (failed.length > 0) {
        const failedDetails = failed
          .map((f) => {
            const agentName = getAgentConfig(f.agentType).displayName
            const errorMsg = f.result.error || "Unknown error"
            return `${agentName}: ${errorMsg}`
          })
          .join("\n")

        const errorMessage =
          failed.length === selectedAgents.length
            ? `Failed to install to all agents:\n${failedDetails}`
            : `Failed to install to ${failed.length} agent(s):\n${failedDetails}`

        throw new Error(errorMessage)
      }

      // Save to lock file (only if at least one installation succeeded)
      if (successful.length > 0) {
        const sanitizedName = sanitizeName(skill.name)
        const gitCommitHash = await getLatestCommitHash(tempDir)
        if (!gitCommitHash) {
          // Warn but don't fail - installation can proceed without commit hash
          // Update detection won't work, but the skill can still be installed
          showToast({
            style: Toast.Style.Failure,
            title: "Warning",
            message: "Could not retrieve commit hash. Update detection may not work.",
          })
        }
        await addSkillToLock(sanitizedName, {
          source: sourceUrl,
          sourceType: "github",
          sourceUrl: sourceUrl,
          gitCommitHash: gitCommitHash || undefined,
        })

        // Save selected agents (only successful ones)
        const successfulAgents = successful.map((r) => r.agentType)
        await saveSelectedAgents(successfulAgents)

        showToast({
          style: Toast.Style.Success,
          title: "Skill installed",
          message: `Installed to ${successful.length} agent(s)`,
        })
      }

      // Reset installation state before calling onComplete
      setState((prev) => ({ ...prev, isInstalling: false, step: "summary" }))

      if (onComplete) {
        onComplete()
      }

      // Navigate back to root (which will show browse skills)
      popToRoot()
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Installation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      })
      // Reset installation state on error too
      setState((prev) => ({ ...prev, isInstalling: false, step: "summary" }))
    } finally {
      if (tempDir) {
        await cleanupTempDir(tempDir).catch(() => {
          // Ignore cleanup errors
        })
      }
    }
  }

  function renderContent() {
    const { step, repositoryMetadata, discoveredSkills, selectedSkills, selectedAgents, scope, method } = state

    // Step: Repository metadata
    if (step === "metadata" && repositoryMetadata) {
      const { owner, repo, description, skills } = repositoryMetadata
      const repoDisplay = owner && repo ? `${owner}/${repo}` : sourceUrl
      const repoUrl = owner && repo ? `https://github.com/${owner}/${repo}` : sourceUrl.replace(/\.git$/, "")

      // Build skills.sh URLs - format: https://skills.sh/{owner}/{repo} or search by skill name
      const skillsShUrl =
        owner && repo
          ? `https://skills.sh/${owner}/${repo}`
          : `https://skills.sh/?q=${encodeURIComponent(skills[0]?.name || "")}`

      const markdown = [
        "```text",
        SKILLS_LOGO,
        "```",
        "",
        "---",
        "",
        "## Repository",
        "",
        `${repoDisplay}`,
        "",
        description ? `> ${description}` : "",
        "",
        `[View on GitHub →](${repoUrl})`,
        "",
        `[View on skills.sh →](${skillsShUrl})`,
        "",
        "---",
        "",
        `## Skills Found: ${skills.length}`,
        "",
        skills
          .map((skill, idx) => {
            const skillLines = [
              `### ${idx + 1}. ${skill.name}`,
              "",
              skill.description || "*No description available*",
              "",
            ]
            return skillLines.join("\n")
          })
          .join("\n\n---\n\n"),
        "",
        "---",
        "",
      ]
        .filter(Boolean)
        .join("\n")

      return (
        <Detail
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action
                title="Continue to Installation"
                icon={Icon.ArrowRight}
                onAction={handleContinueToAgentSelection}
              />
              <Action.OpenInBrowser title="Open Repository on GitHub" url={repoUrl} icon={Icon.Globe} />
              <Action.OpenInBrowser title="View on skills.sh" url={skillsShUrl} icon={Icon.MagnifyingGlass} />
            </ActionPanel>
          }
        />
      )
    }

    // Step: Skill selection (if multiple skills)
    if (step === "skill-selection") {
      return (
        <List>
          <List.Section title="Select skills to install">
            {discoveredSkills.map((skill) => {
              const isSelected = selectedSkills.some((s) => s.path === skill.path)
              return (
                <List.Item
                  key={skill.path}
                  title={skill.name}
                  subtitle={skill.description}
                  accessories={isSelected ? [{ icon: Icon.CheckCircle, text: "Selected" }] : []}
                  actions={
                    <ActionPanel>
                      <Action
                        title={isSelected ? "Deselect" : "Select"}
                        icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                        onAction={() => {
                          const newSkills = isSelected
                            ? selectedSkills.filter((s) => s.path !== skill.path)
                            : [...selectedSkills, skill]
                          setState((prev) => ({ ...prev, selectedSkills: newSkills }))
                        }}
                      />
                      {selectedSkills.length > 0 && (
                        <Action
                          title="Continue"
                          icon={Icon.ArrowRight}
                          onAction={() => handleSkillSelection(selectedSkills)}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              )
            })}
          </List.Section>
        </List>
      )
    }

    // Step: Agent selection
    if (step === "agent-selection") {
      const allAgents = getAllAgents()
      const allSelected = allAgents.length > 0 && selectedAgents.length === allAgents.length

      return (
        <List searchBarPlaceholder="Search agents... (space to toggle)" filtering>
          <List.Section
            title={`Select agents (${selectedAgents.length} selected)`}
            subtitle={allSelected ? "All agents selected" : undefined}
          >
            <List.Item
              title={allSelected ? "Deselect All" : "Select All"}
              icon={allSelected ? Icon.Circle : Icon.CheckCircle}
              actions={
                <ActionPanel>
                  <Action
                    title={allSelected ? "Deselect All" : "Select All"}
                    icon={allSelected ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => {
                      if (allSelected) {
                        setState((prev) => ({ ...prev, selectedAgents: [] }))
                      } else {
                        setState((prev) => ({ ...prev, selectedAgents: allAgents.map((a) => a.name as AgentType) }))
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
            {allAgents.map((agent) => {
              const isSelected = selectedAgents.includes(agent.name as AgentType)
              return (
                <List.Item
                  key={agent.name}
                  title={agent.displayName}
                  subtitle={agent.skillsDir}
                  accessories={isSelected ? [{ icon: Icon.CheckCircle, text: "Selected" }] : []}
                  actions={
                    <ActionPanel>
                      <Action
                        title={isSelected ? "Deselect" : "Select"}
                        icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                        onAction={() => {
                          const newAgents = isSelected
                            ? selectedAgents.filter((a) => a !== agent.name)
                            : [...selectedAgents, agent.name as AgentType]
                          setState((prev) => ({ ...prev, selectedAgents: newAgents }))
                        }}
                      />
                      {selectedAgents.length > 0 && (
                        <Action
                          title="Continue"
                          icon={Icon.ArrowRight}
                          shortcut={{ modifiers: ["cmd"], key: "enter" }}
                          onAction={() => handleAgentSelection(selectedAgents)}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              )
            })}
          </List.Section>
        </List>
      )
    }

    // Step: Scope selection - DISABLED (project-level installation not supported)
    // if (step === 'scope-selection') {
    //   // Skipped - always use global installation
    // }

    // Step: Method selection
    if (step === "method-selection") {
      return (
        <List>
          <List.Section title="Installation method">
            <List.Item
              title="Symlink (Recommended)"
              subtitle="Single source of truth, easier updates"
              accessories={method === "symlink" ? [{ icon: Icon.CheckCircle }] : []}
              actions={
                <ActionPanel>
                  <Action title="Select Symlink" onAction={() => handleMethodSelection("symlink")} />
                </ActionPanel>
              }
            />
            <List.Item
              title="Copy"
              subtitle="Independent copies for each agent"
              accessories={method === "copy" ? [{ icon: Icon.CheckCircle }] : []}
              actions={
                <ActionPanel>
                  <Action title="Select Copy" onAction={() => handleMethodSelection("copy")} />
                </ActionPanel>
              }
            />
          </List.Section>
        </List>
      )
    }

    // Step: Summary
    if (step === "summary") {
      const skill = selectedSkills[0]
      const canonicalPath = getCanonicalPath(sanitizeName(skill.name), { global: scope === "global" })
      const home = homedir()
      const displayPath = canonicalPath.startsWith(home) ? `~${canonicalPath.slice(home.length)}` : canonicalPath

      const markdown = [
        "## Installation Summary",
        "",
        `**Skill:** ${skill.name}`,
        `**Path:** \`${displayPath}\``,
        `**Method:** ${method === "symlink" ? "Symlink" : "Copy"}`,
        `**Scope:** Global`,
        `**Agents:** ${selectedAgents.map((a) => getAgentConfig(a).displayName).join(", ")}`,
        "",
        method === "symlink"
          ? `Symlink will be created from agent directories to: \`${displayPath}\``
          : `Files will be copied to each agent directory`,
      ].join("\n")

      return (
        <Detail
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action title="Install" icon={Icon.Check} onAction={handleInstallation} />
            </ActionPanel>
          }
        />
      )
    }

    // Step: Installing
    if (step === "installing" && state.isInstalling) {
      const installingMarkdown = [
        "```text",
        SKILLS_LOGO,
        "```",
        "",
        "## Installing...",
        "",
        "Please wait while the skill is being installed.",
      ].join("\n")

      return <Detail markdown={installingMarkdown} isLoading={true} />
    }

    // Loading state
    const loadingMarkdown = [
      "```text",
      SKILLS_LOGO,
      "```",
      "",
      "## Loading repository...",
      "",
      "Please wait while we fetch the repository information.",
    ].join("\n")

    return <Detail markdown={loadingMarkdown} isLoading={true} />
  }

  return renderContent()
}
