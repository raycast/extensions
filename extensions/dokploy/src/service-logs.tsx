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

export default function ServiceLogs({ service }: { service: { id: string; type: string; name: string } }) {
  const { url, headers } = useToken();

  const {
    isLoading,
    data: logs,
    revalidate,
  } = useFetch<string, string>(
    url + `${service.type}.readLogs?${ID_FIELDS[service.type]}=${service.id}&tail=${LOG_TAIL}`,
    {
      headers,
      parseResponse: async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return response.text();
      },
      initialData: "",
      keepPreviousData: true,
    },
  );

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
