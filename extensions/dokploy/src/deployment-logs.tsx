import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useToken } from "./instances";
import { parseTrpcTextResponse, trpcQueryUrl } from "./trpc";

const LOG_TAIL = 200;

export default function DeploymentLogs({
  deployment,
  token,
}: {
  deployment: { deploymentId: string; title: string };
  /** Overrides the cached active-instance token - see the identical prop on `DeploymentHistory`. */
  token?: { url: string; headers: Record<string, string> };
}) {
  const activeToken = useToken();
  const { url, headers } = token ?? activeToken;

  const requestUrl = trpcQueryUrl(url, "deployment.readLogs", {
    deploymentId: deployment.deploymentId,
    tail: LOG_TAIL,
  });

  const {
    isLoading,
    data: logs,
    error,
    revalidate,
  } = useFetch<string, string>(requestUrl, {
    headers,
    parseResponse: parseTrpcTextResponse,
    initialData: "",
    keepPreviousData: true,
  });

  const markdown = error
    ? `**Could not load logs.**\n\n${error}`
    : logs
      ? `\`\`\`\n${logs.replace(/```/g, "\\`\\`\\`")}\n\`\`\``
      : "No logs yet.";

  return (
    <Detail
      navigationTitle={`${deployment.title} Logs`}
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
          <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Logs" content={logs} />
        </ActionPanel>
      }
    />
  );
}
