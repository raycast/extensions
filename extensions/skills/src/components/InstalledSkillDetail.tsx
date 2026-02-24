import { ActionPanel, Action, Detail, Icon, Keyboard, useNavigation } from "@raycast/api";
import { readFile } from "fs/promises";
import { join } from "path";
import { useCachedPromise } from "@raycast/utils";
import { type InstalledSkill, removeFrontmatter } from "../shared";
import { RemoveSkillAction } from "./actions/RemoveSkillAction";

export function InstalledSkillDetail({ skill, onRemove }: { skill: InstalledSkill; onRemove: () => void }) {
  const { pop } = useNavigation();
  const { data: content, isLoading } = useCachedPromise(
    async (path: string) => {
      const raw = await readFile(join(path, "SKILL.md"), "utf-8");
      return removeFrontmatter(raw);
    },
    [skill.path],
  );

  const markdown = isLoading ? `# ${skill.name}\n\nLoading...` : (content ?? `# ${skill.name}\n\nNo SKILL.md found.`);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={skill.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={skill.name} />
          <Detail.Metadata.TagList title="Agents">
            {skill.agents.map((agent) => (
              <Detail.Metadata.TagList.Item key={agent} text={agent} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Path" text={skill.path} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <RemoveSkillAction
            skill={skill}
            onRemove={() => {
              onRemove();
              pop();
            }}
          />
          <Action.ShowInFinder path={skill.path} icon={Icon.Finder} />
          <Action.CopyToClipboard
            title="Copy Skill Name"
            content={skill.name}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel>
      }
    />
  );
}
