import { List, Icon, Detail, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";
import { useInstalledSkills } from "./hooks/useInstalledSkills";
import { InstalledSkillListItem } from "./components/InstalledSkillListItem";

export default function Command() {
  const { skills, isLoading, error, revalidate } = useInstalledSkills();
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isShowingDetail, setIsShowingDetail] = useState(true);
  const toggleDetail = () => setIsShowingDetail((prev) => !prev);

  if (error && skills.length === 0) {
    return (
      <Detail
        markdown={`# Error Loading Installed Skills\n\n**Error:** ${error.message}\n\n---\n\nMake sure you have the skills CLI available: \`npx skills list -g\``}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={revalidate} icon={Icon.RotateClockwise} />
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
      )}
    </List>
  );
}
