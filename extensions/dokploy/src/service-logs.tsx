import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useComposeContainers } from "./compose-containers";
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
  service: { id: string; type: string; name: string };
  /** Overrides the cached active-instance token - needed by callers (like Deploy Service) that
   * list services from more than one instance, where the service being viewed might not belong
   * to whichever instance happens to be currently active. */
  token?: { url: string; headers: Record<string, string> };
}) {
  const activeToken = useToken();
  const { url, headers } = token ?? activeToken;
  const isCompose = service.type === "compose";

  // A Compose stack must always land on the container list first and require an explicit pick -
  // this screen *is* that list (below), and picking a container pushes the log view on top of it,
  // so the log view's own back/pop naturally returns here rather than exiting past it to Services.
  if (isCompose) {
    return <ContainerPicker composeId={service.id} service={service} url={url} headers={headers} />;
  }

  return (
    <ServiceLogsDetail
      service={service}
      url={url}
      headers={headers}
      isCompose={false}
      containerId=""
      containerLabel=""
    />
  );
}

function ServiceLogsDetail({
  service,
  url,
  headers,
  isCompose,
  containerId,
  containerLabel,
  onChangeContainer,
}: {
  service: { id: string; type: string; name: string };
  url: string;
  headers: Record<string, string>;
  isCompose: boolean;
  containerId: string;
  containerLabel: string;
  /** Present only for Compose - lets `Change Container` drop back to the picker. */
  onChangeContainer?: () => void;
}) {
  const [following, setFollowing] = useState(false);

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
  });

  // No native polling in useFetch, and Raycast's Background Refresh only re-runs a whole
  // no-view/menu-bar command on a schedule - it can't live-update an already-open view. A manual
  // interval, toggled on/off, is the only way to get a "follow" experience here.
  useEffect(() => {
    if (!following) return;
    const id = setInterval(() => revalidate(), FOLLOW_INTERVAL_MS);
    return () => clearInterval(id);
  }, [following]);

  const markdown = error
    ? `**Could not load logs.**\n\n${error}`
    : logs
      ? `\`\`\`\n${logs.replace(/```/g, "\\`\\`\\`")}\n\`\`\``
      : "No logs yet.";

  return (
    <Detail
      navigationTitle={`${service.name}${containerLabel ? ` (${containerLabel})` : ""} Logs${following ? " (Following)" : ""}`}
      // Following polls on a 3s interval via the same `revalidate`, which would otherwise flip
      // this on for every tick - only the initial/manual load should show it.
      isLoading={isLoading && !following}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
          <Action
            icon={following ? Icon.Pause : Icon.Play}
            title={following ? "Stop Following" : "Start Following"}
            onAction={() => setFollowing((current) => !current)}
          />
          {onChangeContainer && <Action icon={Icon.Box} title="Change Container" onAction={onChangeContainer} />}
          <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Logs" content={logs} />
        </ActionPanel>
      }
    />
  );
}

interface ComposeDetail {
  appName?: string | null;
  serverId?: string | null;
}

/**
 * The container names `compose.loadServices` returns (used elsewhere for `serviceName` fields on
 * domains/backups/schedules) are the *logical* docker-compose.yml service names, not real Docker
 * container ids - `compose.readLogs` needs an actual container, which only shows up in Docker's own
 * container list. `docker.getContainersByAppNameMatch` (appType "docker-compose") is Dokploy's own
 * way of finding a compose stack's real containers by its generated appName.
 */
function ContainerPicker({
  composeId,
  service,
  url,
  headers,
}: {
  composeId: string;
  service: { id: string; type: string; name: string };
  url: string;
  headers: Record<string, string>;
}) {
  const { push, pop } = useNavigation();

  function selectContainer(container: DockerContainer) {
    push(
      <ServiceLogsDetail
        service={service}
        url={url}
        headers={headers}
        isCompose
        containerId={container.containerId}
        containerLabel={container.name}
        onChangeContainer={pop}
      />,
    );
  }

  // Unlike applications, a compose stack's `appName` isn't included in the project tree
  // (`project.all`) - confirmed live, every compose entry there comes back with `appName`
  // undefined. `compose.one` is the same route service-domains.tsx/service-backups.tsx/
  // service-env.tsx already rely on for compose details, so it's fetched here too.
  const {
    data: composeDetail,
    isLoading: composeLoading,
    error: composeError,
    revalidate: retryCompose,
  } = useFetch<ComposeDetail, ComposeDetail | undefined>(`${url}compose.one?composeId=${composeId}`, {
    headers,
    async parseResponse(response) {
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      return (await response.json()) as ComposeDetail;
    },
  });
  const appName = composeDetail?.appName;
  const serverId = composeDetail?.serverId;

  // `docker.getContainers` runs `docker ps` on the Dokploy host itself when `serverId` is omitted -
  // a stack deployed to a remote server would otherwise always come back empty here even though
  // `compose.readLogs` (which takes its `serverId` from the compose record server-side) works fine.
  // Held off with `execute` until `compose.one` settles so this never fires with the wrong scope.
  const {
    data: allContainers,
    isLoading: containersLoading,
    error: containersError,
    revalidate: retryContainers,
  } = useFetch<DockerContainer[], DockerContainer[]>(
    `${url}docker.getContainers${serverId ? `?serverId=${serverId}` : ""}`,
    {
      headers,
      initialData: [],
      execute: !composeLoading,
      async parseResponse(response) {
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          throw new Error(err.message);
        }
        return (await response.json()) as DockerContainer[];
      },
    },
  );

  // This stack's own logical service names (from its compose file) - needed because an `appName`
  // alone isn't a safe prefix: a stack called "blog" would also match another stack/application's
  // containers named "blog-staging-*". Scoping to `<appName>-<serviceName>-` pairs rules that out.
  const {
    containers: serviceNames,
    containersLoading: serviceNamesLoading,
    containersError: serviceNamesError,
    retryContainers: retryServiceNames,
  } = useComposeContainers(url, headers, composeId, true);

  const isLoading = composeLoading || containersLoading || serviceNamesLoading;
  const error = composeError ?? containersError ?? serviceNamesError;

  function revalidate() {
    retryCompose();
    retryContainers();
    retryServiceNames();
  }

  // docker.getContainersByAppNameMatch turned out not to actually scope by this stack (live-tested:
  // it answered with a container that didn't belong to it, "No such container"). docker.getContainers
  // (unscoped, but already proven to return real containerIds - confirmed live) + this stack's own
  // `<appName>-<serviceName>-` prefixes is the reliable way to scope it: Dokploy names every
  // container `<appName>-<serviceName>-<replica>`, confirmed against a real container list.
  const containers =
    appName && serviceNames.length > 0
      ? allContainers.filter((container) =>
          serviceNames.some((serviceName) => container.name.startsWith(`${appName}-${serviceName}-`)),
        )
      : [];

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
      ) : !isLoading && containers.length === 0 ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No Containers Found"
          description={
            serviceNames.length === 0
              ? "This stack has no services defined yet."
              : `No running container matches "${appName}-<service>-" for this stack's services (${serviceNames.join(", ")}).`
          }
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
                <Action title="Select" onAction={() => selectContainer(container)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
