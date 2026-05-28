import { List } from "@raycast/api";
import type { DisplaySkill, HealthIssue } from "../lib/types";

function sourceLabel(s: DisplaySkill): string {
  if (s.source.includes("plugin"))
    return `${s.marketplace ?? "plugin"}${s.pluginName ? `/${s.pluginName}` : ""}`;
  return "user";
}

export function SkillDetail({
  skill,
  issues,
}: {
  skill: DisplaySkill;
  issues: HealthIssue[];
}) {
  const md = `# ${skill.name}\n\n${skill.description || "_No description_"}\n\n---\n\n${
    skill.primary.body || "_No body_"
  }`;
  return (
    <List.Item.Detail
      markdown={md}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Source"
            text={sourceLabel(skill)}
          />
          <List.Item.Detail.Metadata.Label
            title="Path"
            text={skill.primary.realPath}
          />
          <List.Item.Detail.Metadata.TagList title="Surfaces">
            {skill.surfaces.map((s) => (
              <List.Item.Detail.Metadata.TagList.Item key={s} text={s} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          {skill.primary.triggerHints.length > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Triggers"
              text={skill.primary.triggerHints.join(", ")}
            />
          )}
          {issues.length > 0 && (
            <List.Item.Detail.Metadata.Label
              title="Health"
              text={`${issues.length} issue(s)`}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
