import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { useFetch, useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useToken } from "./instances";
import { useComposeContainers } from "./compose-containers";
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
const FOLLOW_INTERVAL_MS = 3000;

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
  const isCompose = service.type === "compose";

  // "Remember container by name": which container in the stack was last picked, per compose
  // service - shared-cache state, same mechanism useToken()/setToken() already relies on in
  // instances.tsx, so the picker (below) updating this is visible here without prop threading.
  const [containerName, setContainerName] = useCachedState<string>(`log-container-${service.id}`, "");
  const [following, setFollowing] = useState(false);

  // Compose can't read logs until a container is picked; every other kind always can.
  const canFetch = !isCompose || Boolean(containerName);

  const requestUrl = trpcQueryUrl(url, isCompose ? "compose.readLogs" : `${service.type}.readLogs`, {
    [ID_FIELDS[service.type]]: service.id,
    ...(isCompose ? { containerId: containerName } : {}),
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
    execute: canFetch,
  });

  // No native polling in useFetch, and Raycast's Background Refresh only re-runs a whole
  // no-view/menu-bar command on a schedule - it can't live-update an already-open view. A manual
  // interval, toggled on/off, is the only way to get a "follow" experience here.
  useEffect(() => {
    if (!following || !canFetch) return;
    const id = setInterval(() => revalidate(), FOLLOW_INTERVAL_MS);
    return () => clearInterval(id);
  }, [following, canFetch]);

  const markdown = !canFetch
    ? "Select a container to view its logs."
    : error
      ? `**Could not load logs.**\n\n${error}`
      : logs
        ? `\`\`\`\n${logs.replace(/```/g, "\\`\\`\\`")}\n\`\`\``
        : "No logs yet.";

  return (
    <Detail
      navigationTitle={`${service.name} Logs${following ? " (Following)" : ""}`}
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {canFetch && (
            <Action
              icon={following ? Icon.Pause : Icon.Play}
              title={following ? "Stop Following" : "Start Following"}
              onAction={() => setFollowing((current) => !current)}
            />
          )}
          {canFetch && <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />}
          {isCompose && (
            <Action.Push
              icon={Icon.Box}
              title={containerName ? "Change Container" : "Select Container"}
              target={
                <ContainerPicker
                  composeId={service.id}
                  url={url}
                  headers={headers}
                  onSelect={(name) => {
                    setFollowing(false);
                    setContainerName(name);
                  }}
                />
              }
            />
          )}
          {canFetch && <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Logs" content={logs} />}
        </ActionPanel>
      }
    />
  );
}

function ContainerPicker({
  composeId,
  url,
  headers,
  onSelect,
}: {
  composeId: string;
  url: string;
  headers: Record<string, string>;
  onSelect: (name: string) => void;
}) {
  const { pop } = useNavigation();
  const { containers, containersLoading, containersError, retryContainers } = useComposeContainers(
    url,
    headers,
    composeId,
    true,
  );

  return (
    <List isLoading={containersLoading} navigationTitle="Select Container">
      {containersError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Load Containers"
          description={`${containersError}`}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={() => retryContainers()} />
            </ActionPanel>
          }
        />
      ) : (
        containers?.map((name) => (
          <List.Item
            key={name}
            icon={Icon.Box}
            title={name}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  onAction={() => {
                    onSelect(name);
                    pop();
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
