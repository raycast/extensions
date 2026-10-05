import { useEffect, useRef } from "react";
import { Detail, ActionPanel, Action, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getDeployment, getDeploymentLogs } from "../api/deployments";
import { getDeploymentStatusIcon, getDeploymentStatusLabel, isDeploymentInProgress } from "../utils/status-icons";
import { formatDate } from "../utils/dates";
import { DeploymentLogStep } from "../types/deployment";

interface Props {
  deploymentId: string;
}

export default function DeploymentDetail({ deploymentId }: Props) {
  const {
    data: deploymentData,
    isLoading: deploymentLoading,
    revalidate: revalidateDeployment,
  } = useCachedPromise((id: string) => getDeployment(id, "initiator"), [deploymentId]);

  const deployment = deploymentData?.data;
  const inProgress = deployment ? isDeploymentInProgress(deployment.attributes.status) : false;

  const {
    data: logsData,
    isLoading: logsLoading,
    revalidate: revalidateLogs,
  } = useCachedPromise((id: string) => getDeploymentLogs(id), [deploymentId], { execute: !!deployment });

  const inProgressRef = useRef(inProgress);
  inProgressRef.current = inProgress;

  useEffect(() => {
    if (!inProgress) return;
    const interval = setInterval(() => {
      if (inProgressRef.current) {
        revalidateDeployment();
        revalidateLogs();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [inProgress]);

  const attrs = deployment?.attributes;
  const statusIcon = attrs ? getDeploymentStatusIcon(attrs.status) : null;

  function formatSteps(steps: DeploymentLogStep[]): string {
    if (steps.length === 0) return "_No steps available_";
    return steps
      .map((step) => {
        const statusEmoji = step.status === "success" ? "+" : step.status === "failed" ? "x" : "-";
        const duration = step.duration_ms ? ` (${(step.duration_ms / 1000).toFixed(1)}s)` : "";
        let line = `[${statusEmoji}] **${step.description}**${duration}`;
        if (step.output) {
          line += `\n\`\`\`\n${step.output}\n\`\`\``;
        }
        return line;
      })
      .join("\n\n");
  }

  const markdown = attrs
    ? `# Deployment ${attrs.commit_hash?.slice(0, 7)}

**Status:** ${getDeploymentStatusLabel(attrs.status)}
**Branch:** ${attrs.branch_name}
**Commit:** ${attrs.commit_message}
${attrs.commit_author ? `**Author:** ${attrs.commit_author}` : ""}
${attrs.failure_reason ? `\n> **Failure:** ${attrs.failure_reason}` : ""}

---

## Build Steps
${logsData ? formatSteps(logsData.data.build.steps) : "_Loading..._"}

## Deploy Steps
${logsData ? formatSteps(logsData.data.deploy.steps) : "_Loading..._"}
`
    : "Loading...";

  return (
    <Detail
      isLoading={deploymentLoading || logsLoading}
      markdown={markdown}
      metadata={
        attrs ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={getDeploymentStatusLabel(attrs.status)}
                color={statusIcon?.color ?? Color.SecondaryText}
              />
            </Detail.Metadata.TagList>
            {inProgress && <Detail.Metadata.Label title="" text="Auto-refreshes when in progress" />}
            <Detail.Metadata.Label title="Branch" text={attrs.branch_name} />
            <Detail.Metadata.Label title="Commit" text={attrs.commit_hash?.slice(0, 7)} />
            <Detail.Metadata.Label title="PHP" text={attrs.php_major_version} />
            <Detail.Metadata.Label title="Node" text={attrs.node_version} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Started" text={formatDate(attrs.started_at)} />
            <Detail.Metadata.Label title="Finished" text={formatDate(attrs.finished_at)} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {attrs && <Action.CopyToClipboard title="Copy Commit Hash" content={attrs.commit_hash} />}
        </ActionPanel>
      }
    />
  );
}
