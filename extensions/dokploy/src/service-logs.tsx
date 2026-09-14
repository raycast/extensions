import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useToken } from "./instances";

const ID_FIELDS: Record<string, string> = {
  application: "applicationId",
  mariadb: "mariadbId",
  mongo: "mongoId",
  mysql: "mysqlId",
  postgres: "postgresId",
  redis: "redisId",
  compose: "composeId",
};

const LOG_TAIL = 200;

/** `readLogs` isn't exposed through Dokploy's OpenAPI bridge, so it has to be called as a raw tRPC query (superjson input, `{ result: { data: { json } } }` output) rather than the plain REST routes used elsewhere in this extension. */
function readLogsUrl(url: string, idField: string, service: { id: string; type: string }): string {
  const input = { json: { [idField]: service.id, tail: LOG_TAIL, since: "all" } };
  return `${url}trpc/${service.type}.readLogs?input=${encodeURIComponent(JSON.stringify(input))}`;
}

interface TrpcSuccess {
  result?: { data?: { json?: string } };
}

export default function ServiceLogs({ service }: { service: { id: string; type: string; name: string } }) {
  const { url, headers } = useToken();

  const {
    isLoading,
    data: logs,
    revalidate,
  } = useFetch<string, string>(readLogsUrl(url, ID_FIELDS[service.type], service), {
    headers,
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const body = (await response.json()) as TrpcSuccess;
      return body.result?.data?.json ?? "";
    },
    initialData: "",
    keepPreviousData: true,
  });

  return (
    <Detail
      navigationTitle={`${service.name} Logs`}
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
