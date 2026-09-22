import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { useFetch, useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useToken } from "./instances";
import { DockerContainer, ErrorResult } from "./interfaces";
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
  service: { id: string; type: string; name: string; appName: string };
  /** Overrides the cached active-instance token - needed by callers (like Deploy Service) that
   * list services from more than one instance, where the service being viewed might not belong
   * to whichever instance happens to be currently active. */
  token?: { url: string; headers: Record<string, string> };
}) {
  const activeToken = useToken();
  const { url, headers } = token ?? activeToken;
  const isCompose = service.type === "compose";

  // "Remember container by name": the last-picked container's own Docker containerId, per compose
  // service - shared-cache state, same mechanism useToken()/setToken() already relies on in
  // instances.tsx, so the picker (below) updating this is visible here without prop threading.
  const [containerId, setContainerId] = useCachedState<string>(`log-container-${service.id}`, "");
  const [containerLabel, setContainerLabel] = useCachedState<string>(`log-container-label-${service.id}`, "");
  const [following, setFollowing] = useState(false);

  // Compose can't read logs until a container is picked; every other kind always can.
  const canFetch = !isCompose || Boolean(containerId);

  const requestUrl = trpcQueryUrl(url, isCompose ? "compose.readLogs" : `${service.type}.readLogs`, {
    [ID_FIELDS[service.type]]: service.id,
    ...(isCompose ? { containerId } : {}),
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
      navigationTitle={`${service.name}${containerLabel ? ` (${containerLabel})` : ""} Logs${following ? " (Following)" : ""}`}
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
              title={containerId ? "Change Container" : "Select Container"}
              target={
                <ContainerPicker
                  appName={service.appName}
                  url={url}
                  headers={headers}
                  onSelect={(container) => {
                    setFollowing(false);
                    setContainerId(container.containerId);
                    setContainerLabel(container.name);
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

/**
 * The container names `compose.loadServices` returns (used elsewhere for `serviceName` fields on
 * domains/backups/schedules) are the *logical* docker-compose.yml service names, not real Docker
 * container ids - `compose.readLogs` needs an actual container, which only shows up in Docker's own
 * container list. `docker.getContainersByAppNameMatch` (appType "docker-compose") is Dokploy's own
 * way of finding a compose stack's real containers by its generated appName.
 */
function ContainerPicker({
  appName,
  url,
  headers,
  onSelect,
}: {
  appName: string;
  url: string;
  headers: Record<string, string>;
  onSelect: (container: DockerContainer) => void;
}) {
  const { pop } = useNavigation();
  const {
    data: containers,
    isLoading,
    error,
    revalidate,
  } = useFetch<DockerContainer[], DockerContainer[]>(
    `${url}docker.getContainersByAppNameMatch?appType=docker-compose&appName=${encodeURIComponent(appName)}`,
    {
      headers,
      initialData: [],
      async parseResponse(response) {
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        return (await response.json()) as DockerContainer[];
      },
    },
  );

  return (
    <List isLoading={isLoading} navigationTitle="Select Container">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Load Containers"
          description={`${error}`}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : (
        containers.map((container) => (
          <List.Item
            key={container.containerId}
            icon={Icon.Box}
            title={container.name}
            accessories={[{ tag: container.state }, { text: container.status }]}
            actions={
              <ActionPanel>
                <Action
                  title="Select"
                  onAction={() => {
                    onSelect(container);
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
