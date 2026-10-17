import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { showSkill } from "../lib/api";
import { tildePath } from "../lib/presentation";

/** Renders a skill's actual SKILL.md, which `skills show` returns in full. */
export function SkillMarkdownView({ reference, title }: { reference: string; title: string }) {
  const { data, isLoading } = useCachedPromise(showSkill, [reference], {
    failureToastOptions: { title: "Could not read skill" },
  });

  return (
    <Detail
      navigationTitle={title}
      isLoading={isLoading}
      markdown={data?.markdown ?? (isLoading ? "" : "_No `SKILL.md` content available._")}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Skill File" text={tildePath(data.skill_file)} />
            <Detail.Metadata.TagList title="Files">
              {data.files.map((file) => (
                <Detail.Metadata.TagList.Item key={file} text={file} />
              ))}
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        data ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Skill.md" content={data.markdown} />
            <Action.ShowInFinder title="Reveal Skill Folder" path={data.path} />
            <Action.CopyToClipboard
              title="Copy Skill Path"
              content={data.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action.Open title="Open in Default Editor" target={data.skill_file} icon={Icon.Pencil} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
