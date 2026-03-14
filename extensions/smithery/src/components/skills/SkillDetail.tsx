import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSkillDetail } from "../../api/smithery";
import { buildSkillInstallTemplate } from "../../constants/commands";
import { buildSkillUrl } from "../../constants/urls";
import { getSmitheryExecutable } from "../../utils/smithery";
import { SkillInstallForm } from "./SkillInstallForm";

type SkillDetailProps = {
  namespace: string;
  slug: string;
};

function buildSkillMarkdown(skill: Awaited<ReturnType<typeof getSkillDetail>>) {
  const lines: string[] = [];

  lines.push(`# ${skill.displayName}`);
  lines.push("");

  if (skill.description) {
    lines.push(skill.description);
    lines.push("");
  }

  lines.push("## Overview");
  lines.push("");
  lines.push(`- ID: \`${skill.namespace}/${skill.slug}\``);
  lines.push(`- Verified: ${skill.verified ? "Yes" : "No"}`);

  if (skill.qualityScore !== undefined) {
    lines.push(`- Quality Score: ${skill.qualityScore.toFixed(2)}`);
  }

  if (skill.categories.length > 0) {
    lines.push(`- Categories: ${skill.categories.join(", ")}`);
  }

  if (skill.servers.length > 0) {
    lines.push(`- Related Servers: ${skill.servers.join(", ")}`);
  }

  if (skill.prompt) {
    lines.push("");
    lines.push("## Prompt");
    lines.push("");
    lines.push("~~~text");
    lines.push(skill.prompt);
    lines.push("~~~");
  }

  return lines.join("\n");
}

export function SkillDetail({ namespace, slug }: SkillDetailProps) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    getSkillDetail,
    [namespace, slug],
    {
      keepPreviousData: true,
    },
  );

  if (error && !data) {
    return (
      <Detail
        markdown={`# Failed to load skill details\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={revalidate}
              icon={Icon.RotateClockwise}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!data) {
    return <Detail isLoading markdown="# Loading skill details..." />;
  }

  const skillId = `${data.namespace}/${data.slug}`;
  const skillUrl = buildSkillUrl(data.namespace, data.slug);
  const installTemplate = buildSkillInstallTemplate(
    skillId,
    getSmitheryExecutable(),
  );

  return (
    <Detail
      markdown={buildSkillMarkdown(data)}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add to Agent"
            icon={Icon.Plus}
            target={
              <SkillInstallForm
                namespace={data.namespace}
                slug={data.slug}
                displayName={data.displayName}
              />
            }
          />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={installTemplate}
          />
          <Action.OpenInBrowser title="Open on Smithery" url={skillUrl} />
        </ActionPanel>
      }
    />
  );
}
