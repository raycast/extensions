import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useMemo } from "react";
import { scanAllSkills } from "./skill-scanner";
import { Skill } from "./types";

function groupSkills(skills: Skill[]) {
  const universal: Skill[] = [];
  const agentSections = new Map<
    string,
    { displayName: string; skills: Skill[] }
  >();
  const system: Skill[] = [];

  for (const skill of skills) {
    if (skill.isSystem) {
      system.push(skill);
    } else if (skill.isUniversal) {
      universal.push(skill);
    } else {
      const primary = skill.agents[0];
      if (primary) {
        let section = agentSections.get(primary.id);
        if (!section) {
          section = { displayName: primary.displayName, skills: [] };
          agentSections.set(primary.id, section);
        }
        section.skills.push(skill);
      }
    }
  }

  const sortedAgentSections = Array.from(agentSections.entries()).sort(
    ([, a], [, b]) => a.displayName.localeCompare(b.displayName),
  );

  return { universal, agentSections: sortedAgentSections, system };
}

function buildKeywords(skill: Skill): string[] {
  const tokens = new Set<string>();
  for (const word of skill.description.split(/\s+/)) {
    const cleaned = word.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
    if (cleaned.length > 2) tokens.add(cleaned);
  }
  for (const file of skill.supplementaryFiles) {
    tokens.add(file.replace(/\.[^.]+$/, "").toLowerCase());
  }
  for (const agent of skill.agents) {
    tokens.add(agent.id);
    for (const word of agent.displayName.toLowerCase().split(/\s+/)) {
      tokens.add(word);
    }
  }
  if (skill.isUniversal) tokens.add("universal");
  if (skill.isSystem) tokens.add("system");
  return Array.from(tokens);
}

function buildSubtitle(skill: Skill): string {
  if (skill.isUniversal && skill.agents.length === 0) return "Universal";
  if (skill.isUniversal) {
    const names = skill.agents
      .slice(0, 2)
      .map((a) => a.displayName)
      .join(", ");
    const extra = skill.agents.length > 2 ? ` +${skill.agents.length - 2}` : "";
    return `Universal · ${names}${extra}`;
  }
  const names = skill.agents
    .slice(0, 3)
    .map((a) => a.displayName)
    .join(", ");
  const extra = skill.agents.length > 3 ? ` +${skill.agents.length - 3}` : "";
  return `${names}${extra}`;
}

function SkillDetail({ skill }: { skill: Skill }) {
  const metadata = (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Name" text={skill.name} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.TagList title="Availability">
        {skill.isUniversal && (
          <List.Item.Detail.Metadata.TagList.Item
            text="Universal"
            color={Color.Purple}
          />
        )}
        {skill.agents.map((agent) => (
          <List.Item.Detail.Metadata.TagList.Item
            key={agent.id}
            text={agent.displayName}
            color={agent.color}
          />
        ))}
        {skill.isSystem && (
          <List.Item.Detail.Metadata.TagList.Item text="System" color="#888" />
        )}
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Path" text={skill.realPath} />
      {skill.supplementaryFiles.length > 0 && (
        <>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Files"
            text={skill.supplementaryFiles.join(", ")}
          />
        </>
      )}
    </List.Item.Detail.Metadata>
  );

  return (
    <List.Item.Detail markdown={skill.markdownContent} metadata={metadata} />
  );
}

function SkillListItem({ skill }: { skill: Skill }) {
  const keywords = useMemo(() => buildKeywords(skill), [skill]);
  const subtitle = buildSubtitle(skill);

  return (
    <List.Item
      key={skill.realPath}
      title={skill.name}
      subtitle={subtitle}
      keywords={keywords}
      accessories={[
        ...(skill.isSystem
          ? [{ tag: { value: "System", color: "#888" } }]
          : []),
        { text: `${skill.supplementaryFiles.length + 1} files` },
      ]}
      detail={<SkillDetail skill={skill} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.OpenWith
              path={skill.skillMdPath}
              title="Open Skill File"
              icon={Icon.Document}
            />
            <Action.ShowInFinder
              path={skill.realPath}
              title="Reveal in Finder"
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Skill Path"
              content={skill.realPath}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Skill Content"
              content={skill.markdownContent}
              shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function SearchSkills() {
  const skills = useMemo(() => scanAllSkills(), []);
  const { universal, agentSections, system } = useMemo(
    () => groupSkills(skills),
    [skills],
  );

  return (
    <List
      isShowingDetail={skills.length > 0}
      searchBarPlaceholder="Search agent skills..."
    >
      {skills.length === 0 && (
        <List.EmptyView
          title="No Skills Found"
          description="Install skills with npx skills add <source>"
        />
      )}
      {universal.length > 0 && (
        <List.Section title="Universal" subtitle={`${universal.length} skills`}>
          {universal.map((skill) => (
            <SkillListItem key={skill.realPath} skill={skill} />
          ))}
        </List.Section>
      )}
      {agentSections.map(([agentId, section]) => (
        <List.Section
          key={agentId}
          title={section.displayName}
          subtitle={`${section.skills.length} skills`}
        >
          {section.skills.map((skill) => (
            <SkillListItem key={skill.realPath} skill={skill} />
          ))}
        </List.Section>
      ))}
      {system.length > 0 && (
        <List.Section title="System" subtitle={`${system.length} skills`}>
          {system.map((skill) => (
            <SkillListItem key={skill.realPath} skill={skill} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
