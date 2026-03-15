import { List, Icon, Detail, ActionPanel, Action, Color, openExtensionPreferences } from "@raycast/api";
import { useState } from "react";
import { useInstalledSkills } from "./hooks/useInstalledSkills";
import { isNpxResolutionError } from "./utils/skills-cli";
import { InstalledSkillListItem } from "./components/InstalledSkillListItem";
import { UpdateSkillAction } from "./components/actions/UpdateSkillAction";

export default function Command() {
  const { skills, isLoading, error, revalidate } = useInstalledSkills();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const toggleDetail = () => setIsShowingDetail((prev) => !prev);
  const hasNpxResolutionError = error ? isNpxResolutionError(error) : false;

  if (error && skills.length === 0) {
    let errorMarkdown = `# Error Loading Installed Skills

**Error:** ${error?.message}

---

This is a local skills CLI execution failure.

If this persists:

1. Retry the command.
2. Open Extension Preferences and verify **Custom npx Path** if you use a non-standard Node.js setup.
3. Run \`npx -y skills@latest list -g\` in Terminal to inspect the underlying CLI error.
`;

    if (hasNpxResolutionError) {
      errorMarkdown = `# Error Loading Installed Skills

**Error:** ${error?.message}

---

This is an npx resolution issue in the local CLI runtime.

1. Run \`which npx\` in Terminal.
2. Open Extension Preferences (\`Cmd+Shift+,\`).
3. Set **Custom npx Path** to the path from step 1, then retry.
`;
    }

    return (
      <Detail
        markdown={errorMarkdown}
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
          description="Install skills using the search or trending commands"
          icon={Icon.Box}
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
