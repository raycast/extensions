import { List, Detail, Icon, ActionPanel, Action, Color, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { useInstalledSkills } from "./hooks/useInstalledSkills";
import { isInvalidCustomNpxPathError, isNpxResolutionError } from "./utils/skills-cli";
import { InstalledSkillListItem } from "./components/InstalledSkillListItem";
import { UpdateSkillAction } from "./components/actions/UpdateSkillAction";

export default function Command() {
  const { skills, isLoading, error, revalidate, mutate } = useInstalledSkills();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const toggleDetail = () => setIsShowingDetail((prev) => !prev);
  const hasInvalidCustomNpxPathError = error ? isInvalidCustomNpxPathError(error) : false;
  const hasNpxResolutionError = error ? isNpxResolutionError(error) : false;

  if (error && skills.length === 0) {
    const { errorTitle, errorDetails } = hasInvalidCustomNpxPathError
      ? {
          errorTitle: "Invalid Custom npx Path",
          errorDetails:
            "The configured **Custom npx Path** does not point to a valid `npx` executable.\n\n1. Open Extension Preferences (`Cmd+Shift+,`).\n2. Fix or clear **Custom npx Path**.\n3. If unsure, run `which npx` in Terminal and use that value.",
        }
      : hasNpxResolutionError
        ? {
            errorTitle: "Unable to Load Installed Skills",
            errorDetails:
              "This is a package runner resolution issue in the local CLI runtime.\n\n1. Install or repair Bun so `bunx` works.\n2. If you need to force Node/npm instead, run `which npx` in Terminal.\n3. Open Extension Preferences (`Cmd+Shift+,`) and set **Custom npx Path** to the path from step 2, then retry.",
          }
        : {
            errorTitle: "Unable to Load Installed Skills",
            errorDetails:
              "This is a local Skills CLI execution failure.\n\n1. Retry the command.\n2. Open Extension Preferences and verify **Custom npx Path** if you force a non-standard Node.js setup.\n3. Run `bunx skills@latest list -g` (or `npx -y skills@latest list -g` if Bun is not installed) in Terminal to inspect the underlying CLI error.",
          };

    return (
      <Detail
        markdown={`# ${errorTitle}\n\n**Error:** ${error.message}\n\n---\n\n${errorDetails}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={revalidate} icon={Icon.RotateClockwise} />
            <Action title="Open Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
          </ActionPanel>
        }
      />
    );
  }

  const agentCounts = new Map<string, number>();
  for (const skill of skills) {
    for (const agent of skill.agents) {
      agentCounts.set(agent, (agentCounts.get(agent) ?? 0) + 1);
    }
  }
  const agents = [...agentCounts.keys()].sort();

  const filteredSkills = selectedAgent === "all" ? skills : skills.filter((s) => s.agents.includes(selectedAgent));
  // Global count — "Update All" applies to all agents regardless of filter
  const updatableCount = skills.filter((s) => s.hasUpdate).length;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search installed skills..."
      onSelectionChange={setSelectedId}
      isShowingDetail={filteredSkills.length > 0 && isShowingDetail}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Agent" value={selectedAgent} storeValue onChange={setSelectedAgent}>
          <List.Dropdown.Item title={`All Agents (${skills.length})`} value="all" />
          {agents.length > 0 && (
            <List.Dropdown.Section title="Agents">
              {agents.map((agent) => (
                <List.Dropdown.Item key={agent} title={`${agent} (${agentCounts.get(agent)})`} value={agent} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {skills.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Installed Skills"
          description="Install skills from Search Skills to manage them here."
          icon={Icon.Box}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                onAction={revalidate}
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : filteredSkills.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Results for Current Filter"
          description={`No installed skills match the "${selectedAgent}" filter. Try selecting a different agent.`}
          icon={Icon.Filter}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                onAction={revalidate}
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {updatableCount > 0 && (
            <List.Section
              title="Updates Available"
              subtitle={`${updatableCount} skill${updatableCount > 1 ? "s" : ""}`}
            >
              <List.Item
                title="Update All"
                icon={{ source: Icon.ArrowClockwise, tintColor: Color.Orange }}
                detail={
                  <List.Item.Detail
                    markdown={`# Update All Skills\n\nPress **Enter** to update all **${updatableCount}** outdated skill${updatableCount > 1 ? "s" : ""} at once.`}
                  />
                }
                actions={
                  <ActionPanel>
                    <UpdateSkillAction mutate={mutate} />
                    <Action
                      title="Refresh Installed Skills"
                      onAction={revalidate}
                      icon={Icon.RotateClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          <List.Section title="Installed Skills" subtitle={`${filteredSkills.length} skills`}>
            {filteredSkills.map((skill) => (
              <InstalledSkillListItem
                key={skill.name}
                skill={skill}
                isSelected={selectedId === skill.name}
                isShowingDetail={isShowingDetail}
                mutate={mutate}
                onToggleDetail={toggleDetail}
                onRefresh={revalidate}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
