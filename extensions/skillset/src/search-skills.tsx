import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as path from "path";
import { listSkills, readSkill, SKILL_FILE, type Skill } from "./lib/skills";

function SkillDetail({ skill, root }: { skill: Skill; root: string }) {
  const { content, metadata } = readSkill(root, skill.name);
  const hasMetadata = Object.keys(metadata).length > 0;
  return (
    <Detail
      markdown={content}
      navigationTitle={skill.name}
      metadata={
        hasMetadata ? (
          <Detail.Metadata>
            {Object.entries(metadata).map(([key, value]) => (
              <Detail.Metadata.Label key={key} title={key.charAt(0).toUpperCase() + key.slice(1)} text={value} />
            ))}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Name" content={skill.name} />
          <Action.OpenWith path={path.join(skill.dir, SKILL_FILE)} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const prefs = getPreferenceValues<{ skillsDirectory: string }>();
  const root = prefs.skillsDirectory?.trim() ?? "";
  const { data: skills, isLoading, error } = useCachedPromise(listSkills, [root], { execute: !!root });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search skills...">
      {!root && <List.EmptyView title="Skills directory not set" description="Configure in extension preferences" />}
      {root && error && <List.EmptyView title="Could not read skills" description={error.message} />}
      {root && !error && skills?.length === 0 && (
        <List.EmptyView title="No skills found" description={`Add SKILL.md files in subdirectories of ${root}`} />
      )}
      {(skills ?? []).map((skill) => (
        <List.Item
          key={skill.name}
          id={skill.name}
          title={skill.name}
          subtitle={skill.summary}
          keywords={[skill.name, skill.summary].filter((x): x is string => Boolean(x))}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" icon={Icon.Eye} target={<SkillDetail skill={skill} root={root} />} />
              <Action.CopyToClipboard title="Copy Name" content={skill.name} />
              <Action.OpenWith path={path.join(skill.dir, SKILL_FILE)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
