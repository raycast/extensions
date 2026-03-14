import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getServerDetailWithSummary } from "../../api/smithery";
import { buildMcpInstallTemplate } from "../../constants/commands";
import { buildMcpServerUrl } from "../../constants/urls";
import {
  formatCompactNumber,
  formatDate,
  formatScoreOutOf100,
} from "../../utils/format";
import { getSmitheryExecutable } from "../../utils/smithery";
import { McpInstallForm } from "./McpInstallForm";

type McpServerDetailProps = {
  qualifiedName: string;
};

function buildServerMarkdown(
  server: Awaited<ReturnType<typeof getServerDetailWithSummary>>,
) {
  const lines: string[] = [];

  lines.push(`# ${server.displayName}`);
  lines.push("");

  if (server.description) {
    lines.push(server.description);
    lines.push("");
  }

  lines.push("## Overview");
  lines.push("");
  lines.push(`- Qualified Name: \`${server.qualifiedName}\``);
  lines.push(`- Verified: ${server.verified ? "Yes" : "No"}`);
  lines.push(`- Connection Type: ${server.remote ? "Remote" : "Local"}`);

  const uses = formatCompactNumber(server.useCount);
  if (uses) {
    lines.push(`- Uses: ${uses}`);
  }

  const score = formatScoreOutOf100(server.score);
  if (score) {
    lines.push(`- Score: ${score}`);
  }

  if (server.isDeployed !== undefined) {
    lines.push(`- Deployed: ${server.isDeployed ? "Yes" : "No"}`);
  }

  const createdDate = formatDate(server.createdAt);
  if (createdDate) {
    lines.push(`- Created: ${createdDate}`);
  }

  if (server.security?.scanPassed !== undefined) {
    lines.push(
      `- Security Scan: ${server.security.scanPassed ? "Passed" : "Unavailable"}`,
    );
  }

  if (server.tools.length > 0) {
    lines.push("");
    lines.push("## Tools");
    lines.push("");
    for (const tool of server.tools.slice(0, 20)) {
      lines.push(
        `- ${tool.name}${tool.description ? `: ${tool.description}` : ""}`,
      );
    }
    if (server.tools.length > 20) {
      lines.push(`- ...and ${server.tools.length - 20} more`);
    }
  }

  return lines.join("\n");
}

export function McpServerDetail({ qualifiedName }: McpServerDetailProps) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    getServerDetailWithSummary,
    [qualifiedName],
    {
      keepPreviousData: true,
    },
  );

  if (error && !data) {
    return (
      <Detail
        markdown={`# Failed to load server details\n\n${error.message}`}
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
    return <Detail isLoading markdown="# Loading server details..." />;
  }

  const serverUrl = buildMcpServerUrl(data.qualifiedName);
  const installTemplate = buildMcpInstallTemplate(
    data.qualifiedName,
    getSmitheryExecutable(),
  );

  return (
    <Detail
      markdown={buildServerMarkdown(data)}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add to Client"
            icon={Icon.Plus}
            target={
              <McpInstallForm
                qualifiedName={data.qualifiedName}
                displayName={data.displayName}
              />
            }
          />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={installTemplate}
          />
          <Action.OpenInBrowser title="Open on Smithery" url={serverUrl} />
        </ActionPanel>
      }
    />
  );
}
