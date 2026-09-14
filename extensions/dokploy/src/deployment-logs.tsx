import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useToken } from "./instances";
import { parseTrpcTextResponse, trpcQueryUrl } from "./trpc";

const LOG_TAIL = 200;

export default function DeploymentLogs({ deployment }: { deployment: { deploymentId: string; title: string } }) {
  const { url, headers } = useToken();

  const requestUrl = trpcQueryUrl(url, "deployment.readLogs", {
    deploymentId: deployment.deploymentId,
    tail: LOG_TAIL,
  });

  const {
    isLoading,
    data: logs,
    revalidate,
  } = useFetch<string, string>(requestUrl, {
    headers,
    parseResponse: parseTrpcTextResponse,
    initialData: "",
    keepPreviousData: true,
  });

  return (
    <Detail
      navigationTitle={`${deployment.title} Logs`}
      isLoading={isLoading}
      markdown={logs ? `\`\`\`\n${logs.replace(/```/g, "\\`\\`\\`")}\n\`\`\`` : "No logs yet."}
      actions={
        <ActionPanel>
          <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
          <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Logs" content={logs} />
        </ActionPanel>
      }
    />
  );
}
