import { List, Icon, ActionPanel, Action, Color, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { CommandEmptyView, CommandErrorDetail, RetryAction } from "./components/CommandStates";
import { useInstalledSkills } from "./hooks/useInstalledSkills";
import { isNpxResolutionError } from "./utils/skills-cli";
import { InstalledSkillListItem } from "./components/InstalledSkillListItem";
import { UpdateSkillAction } from "./components/actions/UpdateSkillAction";

export default function Command() {
  const { skills, isLoading, error, revalidate, mutate } = useInstalledSkills();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const toggleDetail = () => setIsShowingDetail((prev) => !prev);
  const hasNpxResolutionError = error ? isNpxResolutionError(error) : false;

  if (error && skills.length === 0) {
    return (
      <CommandErrorDetail
        title="Unable to Load Installed Skills"
        message={error.message}
        detailsMarkdown={
          hasNpxResolutionError
            ? "This is an `npx` resolution issue in the local CLI runtime.\n\n1. Run `which npx` in Terminal.\n2. Open Extension Preferences (`Cmd+Shift+,`).\n3. Set **Custom npx Path** to the path from step 1, then retry."
            : "This is a local Skills CLI execution failure.\n\n1. Retry the command.\n2. Open Extension Preferences and verify **Custom npx Path** if you use a non-standard Node.js setup.\n3. Run `npx -y skills@latest list -g` in Terminal to inspect the underlying CLI error."
        }
        actions={
          <ActionPanel>
            <RetryAction onAction={revalidate} />
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
        <CommandEmptyView
          title="No Installed Skills"
          description="Install skills from Search Skills to manage them here."
          icon={Icon.Box}
          actions={
            <ActionPanel>
              <RetryAction onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : filteredSkills.length === 0 && !isLoading ? (
        <CommandEmptyView
          title="No Results for Current Filter"
          description={`No installed skills match the "${selectedAgent}" filter. Try selecting a different agent.`}
          icon={Icon.Filter}
          actions={
            <ActionPanel>
              <RetryAction onAction={revalidate} />
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
                    <UpdateSkillAction onUpdate={revalidate} />
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
                onUpdate={revalidate}
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
