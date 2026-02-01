import React, { useState, useEffect } from "react"
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api"
import { searchSkills, fetchPopularSkills } from "../skills-api"
import { listInstalledSkills } from "../skill-registry"
import { InstallFlow } from "./install-flow"
import { getSkillInstallState } from "../update-detector"
import type { Skill, AgentType } from "../types"

export default function BrowseSkills() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchText, setSearchText] = useState("")
  const [installStates, setInstallStates] = useState<Map<string, { status: string; agents: AgentType[] }>>(new Map())
  const [installFlowKey, setInstallFlowKey] = useState(0)

  useEffect(() => {
    loadPopularSkills()
  }, [])

  useEffect(() => {
    if (searchText.length >= 2) {
      search()
    } else if (searchText.length === 0) {
      loadPopularSkills()
    }
  }, [searchText])

  async function loadPopularSkills() {
    setIsLoading(true)
    try {
      const popular = await fetchPopularSkills(50)
      setSkills(popular)
      await updateInstallStates(popular)
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load skills",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function search() {
    setIsLoading(true)
    try {
      const results = await searchSkills(searchText, 50)
      setSkills(results)
      await updateInstallStates(results)
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function updateInstallStates(skillsToCheck: Skill[]) {
    const installedSkills = await listInstalledSkills()
    const installedMap = new Map(installedSkills.map((s) => [s.name, s]))
    const states = new Map<string, { status: string; agents: AgentType[] }>()

    for (const skill of skillsToCheck) {
      const installed = installedMap.get(skill.name)

      if (!installed) {
        states.set(skill.name, {
          status: "not_installed",
          agents: [],
        })
        continue
      }

      // Check for updates if repository URL is available
      if (skill.repositoryUrl) {
        try {
          const installState = await getSkillInstallState(skill.name, skill.repositoryUrl)
          states.set(skill.name, {
            status: installState.status,
            agents: installState.installedAgents.length > 0 ? installState.installedAgents : installed.agents,
          })
        } catch (error) {
          // Fallback to installed status if update check fails
          states.set(skill.name, {
            status: "installed",
            agents: installed.agents,
          })
        }
      } else {
        // No repository URL, just mark as installed
        states.set(skill.name, {
          status: "installed",
          agents: installed.agents,
        })
      }
    }

    setInstallStates(states)
  }

  function getStatusIcon(status: string): Icon {
    switch (status) {
      case "installed":
        return Icon.CheckCircle
      case "update_available":
        return Icon.ArrowClockwise
      default:
        return Icon.PlusCircle
    }
  }

  function getStatusText(status: string, agents: AgentType[]): string {
    switch (status) {
      case "installed":
        return agents.length > 0 ? `Installed (${agents.length} agent${agents.length > 1 ? "s" : ""})` : "Installed"
      case "update_available":
        return "Update (changes detected)"
      default:
        return "Install"
    }
  }

  async function handleInstallComplete() {
    // Clear search text and refresh skills list after installation
    setSearchText("")
    await loadPopularSkills()
    setInstallFlowKey((prev) => prev + 1) // Force re-render
  }

  function handleInstallStart() {
    setSearchText("")
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search skills..." onSearchTextChange={setSearchText} throttle>
      {skills.map((skill) => {
        const state = installStates.get(skill.name) || { status: "not_installed", agents: [] }
        const statusIcon = getStatusIcon(state.status)
        const statusText = getStatusText(state.status, state.agents)

        // Build subtitle with description and repository
        const repository = skill.owner && skill.repo ? `${skill.owner}/${skill.repo}` : null
        const subtitleParts: string[] = []
        if (skill.description) {
          subtitleParts.push(skill.description)
        }
        if (repository) {
          subtitleParts.push(repository)
        }
        const subtitle = subtitleParts.length > 0 ? subtitleParts.join(" • ") : "No description"

        return (
          <List.Item
            key={skill.id}
            title={skill.name}
            subtitle={subtitle}
            accessories={[
              { text: `${skill.installCount.toLocaleString()} installs` },
              { icon: statusIcon, text: statusText },
            ]}
            actions={
              <ActionPanel>
                {skill.repositoryUrl && (
                  <Action.Push
                    title={state.status === "installed" ? "Reinstall" : "Install"}
                    icon={Icon.Plus}
                    target={
                      <InstallFlow
                        key={installFlowKey}
                        sourceUrl={skill.repositoryUrl}
                        skillName={skill.name}
                        onComplete={handleInstallComplete}
                      />
                    }
                    onPush={handleInstallStart}
                  />
                )}
                {state.status === "update_available" && skill.repositoryUrl && (
                  <Action.Push
                    title="Update (changes detected)"
                    icon={Icon.ArrowClockwise}
                    target={
                      <InstallFlow
                        key={installFlowKey}
                        sourceUrl={skill.repositoryUrl}
                        skillName={skill.name}
                        onComplete={handleInstallComplete}
                      />
                    }
                    onPush={handleInstallStart}
                  />
                )}
                <Action.OpenInBrowser url={skill.url} />
                {skill.repositoryUrl && <Action.OpenInBrowser url={skill.repositoryUrl} title="Open Repository" />}
              </ActionPanel>
            }
          />
        )
      })}
    </List>
  )
}
