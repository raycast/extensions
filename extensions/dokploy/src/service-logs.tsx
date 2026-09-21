import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useToken } from "./instances";
import { parseTrpcTextResponse, trpcQueryUrl } from "./trpc";

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

export default function ServiceLogs({
  service,
  token,
}: {
  service: { id: string; type: string; name: string };
  /** Overrides the cached active-instance token - needed by callers (like Deploy Service) that
   * list services from more than one instance, where the service being viewed might not belong
   * to whichever instance happens to be currently active. */
  token?: { url: string; headers: Record<string, string> };
}) {
  const activeToken = useToken();
  const { url, headers } = token ?? activeToken;

  const requestUrl = trpcQueryUrl(url, `${service.type}.readLogs`, {
    [ID_FIELDS[service.type]]: service.id,
    tail: LOG_TAIL,
    since: "all",
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
      navigationTitle={`${service.name} Logs`}
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
