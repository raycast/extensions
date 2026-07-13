import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { DokployClient } from "../api/client";
import { readDeploymentLogs } from "../api/dokploy-api";
import { toErrorMessage } from "../api/errors";
import { commitMessageBody, firstLine } from "../lib/format";
import { deploymentTag } from "../lib/status";
import { Deployment } from "../types/dokploy";

interface DeploymentLogsProps {
  client: DokployClient;
  deployment: Deployment;
  serviceName: string;
}

/** The build log for one deployment - where you look when a deploy went red. */
export function DeploymentLogs({ client, deployment, serviceName }: DeploymentLogsProps) {
  const { data, isLoading, revalidate, error } = usePromise(
    async (deploymentId: string) => readDeploymentLogs(client, deploymentId),
    [deployment.deploymentId],
  );

  const status = deploymentTag(deployment.status);

  const body = error
    ? `> Could not load the build log: ${toErrorMessage(error)}`
    : data?.trim()
      ? `\`\`\`\n${data.trimEnd()}\n\`\`\``
      : isLoading
        ? ""
        : "_This deployment produced no build output._";

  // The error message is stored on the deployment itself, so it's worth surfacing even when
  // the log is empty - a build that failed to start has one but no log.
  const errorBanner = deployment.errorMessage?.trim() ? `> **Failed:** ${deployment.errorMessage.trim()}\n\n` : "";

  // The list rows only have room for the commit's subject line. This is where the full message,
  // body and all, is worth showing - so it isn't lost, just moved somewhere it fits.
  const subject = firstLine(deployment.title) || "Deployment";
  const commitBody = commitMessageBody(deployment.title);
  const bodyBlock = commitBody ? `\n${commitBody.replace(/^/gm, "> ")}\n` : "";

  const markdown = `## ${subject}\n${bodyBlock}\n${errorBanner}${body}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${serviceName} - Build Log`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={status.value} color={status.color} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Service" text={serviceName} />
          {deployment.description && <Detail.Metadata.Label title="Description" text={deployment.description} />}
          {deployment.createdAt && (
            <Detail.Metadata.Label title="Started" text={new Date(deployment.createdAt).toLocaleString()} />
          )}
          {deployment.finishedAt && (
            <Detail.Metadata.Label title="Finished" text={new Date(deployment.finishedAt).toLocaleString()} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action.CopyToClipboard title="Copy Build Log" content={data ?? ""} />
          <Action.CopyToClipboard
            title="Copy Deployment ID"
            content={deployment.deploymentId}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
