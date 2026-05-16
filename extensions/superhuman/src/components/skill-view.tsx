import { Action, ActionPanel, Clipboard, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";
import { Skill, buildPrompt } from "../lib/skills";
import { isReadOnly } from "../lib/readonly";

interface Props {
  skill: Skill;
}

export function SkillView({ skill }: Props) {
  const prompt = useMemo(() => buildPrompt(skill), [skill]);
  const readOnlyBlocked = !skill.frontmatter.read_only && isReadOnly();

  const markdown = `# ${titleCase(skill.frontmatter.name)}

> ${skill.frontmatter.description}

${readOnlyBlocked ? readOnlyBanner() : ""}

${skill.body.trim()}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Skill" text={skill.frontmatter.name} />
          <Detail.Metadata.Label
            title="Mode"
            text={skill.frontmatter.read_only ? "read-only" : "writes to account"}
            icon={skill.frontmatter.read_only ? Icon.Eye : Icon.Pencil}
          />
          <Detail.Metadata.TagList title="Tools">
            {skill.frontmatter.tools_used.map((tool) => (
              <Detail.Metadata.TagList.Item key={tool} text={tool} />
            ))}
          </Detail.Metadata.TagList>
          {skill.frontmatter.upstream ? (
            <Detail.Metadata.Link title="Upstream" target={skill.frontmatter.upstream} text="superhuman/mcp-mail" />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Copy Prompt for Quick AI"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy(`@superhuman ${prompt}`);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied",
                message: "Paste into Quick AI to run this skill.",
              });
            }}
          />
          <Action.CopyToClipboard
            title="Copy Raw Prompt (no @superhuman)"
            content={prompt}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function readOnlyBanner(): string {
  return [
    "",
    "> ⚠️ **Read-only mode is on.** This skill writes to your account, so it will be blocked at execution.",
    "> Disable the *Read-only mode* preference in Extensions → Superhuman to run it.",
    "",
  ].join("\n");
}
