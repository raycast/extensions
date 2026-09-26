import { DeployType, resolveCandidate } from "../candidates";
import { parseContainerNames } from "../compose-containers";
import { DockerContainer } from "../interfaces";
import { parseTrpcTextResponse, trpcQueryUrl } from "../trpc";

const MAX_LINES = 500;
const DEFAULT_LINES = 100;

type Input = {
  /** Name or id of the service. */
  service: string;
  /** How many lines from the end of the log to read. Defaults to 100, capped at 500. */
  lines?: number;
  /** Compose stacks only - which container to read, matched against its name. Omit to read the stack's first container. */
  container?: string;
  /** Narrows the lookup when more than one project has a service with this name. */
  project?: string;
  /** Narrows the lookup to one kind of service. */
  kind?: DeployType;
  /** Narrows the lookup to one configured instance, by name. */
  instance?: string;
};

interface ComposeDetail {
  appName?: string | null;
  serverId?: string | null;
}

/**
 * The runtime log of a service - what the container is printing right now. For why a *build*
 * failed, use `get-deployment-logs` instead - this is the running process's own output.
 */
export default async function tool(input: Input) {
  const candidate = await resolveCandidate(input.service, {
    instance: input.instance,
    project: input.project,
    kind: input.kind,
  });
  const tail = Math.min(input.lines ?? DEFAULT_LINES, MAX_LINES);

  if (candidate.deployType !== "compose") {
    const response = await fetch(
      trpcQueryUrl(candidate.url, `${candidate.deployType}.readLogs`, {
        [candidate.idField]: candidate.id,
        tail,
        since: "all",
      }),
      { headers: candidate.headers },
    );
    const logs = await parseTrpcTextResponse(response);
    return { service: candidate.name, status: candidate.status, logs: logs.trim() || "(no log output)" };
  }

  // A compose stack has no single log stream - Dokploy scopes `compose.readLogs` to one real
  // Docker container, the same discovery `service-logs.tsx`'s container picker does live in the UI.
  const composeResponse = await fetch(`${candidate.url}compose.one?composeId=${candidate.id}`, {
    headers: candidate.headers,
  });
  if (!composeResponse.ok)
    throw new Error(`Could not load ${candidate.name}'s compose details (${composeResponse.status}).`);
  const composeDetail = (await composeResponse.json()) as ComposeDetail;

  // `docker.getContainers` runs `docker ps` on the Dokploy host itself when `serverId` is omitted -
  // pass it through so a stack deployed to a remote server is actually found.
  const containersResponse = await fetch(
    `${candidate.url}docker.getContainers${composeDetail.serverId ? `?serverId=${composeDetail.serverId}` : ""}`,
    { headers: candidate.headers },
  );
  if (!containersResponse.ok) throw new Error(`Could not load containers (${containersResponse.status}).`);
  const allContainers = (await containersResponse.json()) as DockerContainer[];

  const serviceNamesResponse = await fetch(
    `${candidate.url}compose.loadServices?composeId=${candidate.id}&type=fetch`,
    {
      headers: candidate.headers,
    },
  );
  const serviceNames = serviceNamesResponse.ok ? parseContainerNames(await serviceNamesResponse.json()) : [];

  // An `appName` prefix alone isn't a safe scope (a stack "blog" also matches "blog-staging-*"
  // containers from something else) - requiring `<appName>-<serviceName>-` rules that out.
  const appName = composeDetail.appName;
  const containers =
    appName && serviceNames.length > 0
      ? allContainers.filter((container) =>
          serviceNames.some((serviceName) => container.name.startsWith(`${appName}-${serviceName}-`)),
        )
      : [];

  if (containers.length === 0) {
    throw new Error(
      `No running container found for "${candidate.name}" - it may have no services defined, or none are currently running.`,
    );
  }

  let target = containers[0];
  if (input.container) {
    const exact = containers.find((container) => container.name === input.container);
    const partial = containers.filter((container) => container.name.includes(input.container!));
    if (exact) {
      target = exact;
    } else if (partial.length === 1) {
      target = partial[0];
    } else if (partial.length > 1) {
      throw new Error(
        `"${input.container}" matches more than one container: ${partial.map((container) => container.name).join(", ")}. Use the exact name.`,
      );
    } else {
      throw new Error(
        `No container matching "${input.container}". Available: ${containers.map((container) => container.name).join(", ")}.`,
      );
    }
  }

  const response = await fetch(
    trpcQueryUrl(candidate.url, "compose.readLogs", {
      composeId: candidate.id,
      containerId: target.containerId,
      tail,
      since: "all",
    }),
    { headers: candidate.headers },
  );
  const logs = await parseTrpcTextResponse(response);

  return {
    service: candidate.name,
    container: target.name,
    otherContainers:
      containers.length > 1
        ? containers
            .filter((container) => container.containerId !== target.containerId)
            .map((container) => container.name)
        : undefined,
    status: candidate.status,
    logs: logs.trim() || "(no log output)",
  };
}
