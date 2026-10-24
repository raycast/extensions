export const DOCKER = "docker";
export const DOCKER_CONTEXT = "orbstack";

/** Container lifecycle events that should refresh the list. */
export const DOCKER_CONTAINER_REFRESH_EVENTS = new Set([
  "start",
  "stop",
  "die",
  "kill",
  "destroy",
  "pause",
  "unpause",
  "restart",
  "oom",
  "health_status",
]);

/** Always pin OrbStack so Docker Desktop / other contexts do not break the command. */
export function dockerArgs(...args: string[]): string[] {
  return ["--context", DOCKER_CONTEXT, ...args];
}

/** Shape from `docker ps -a --format '{{json .}}'` (one object per line). */
export interface DockerContainer {
  ID: string;
  Names: string;
  Image: string;
  Command: string;
  CreatedAt: string;
  Ports: string;
  State: string;
  Status: string;
  Labels: string;
  Networks: string;
  Mounts: string;
  Size?: string;
  HealthStatus?: string;
}

export function parseDockerPsOutput(output: string): DockerContainer[] {
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }

  return trimmed.split("\n").map((line) => JSON.parse(line) as DockerContainer);
}

export function isContainerRunning(state: string): boolean {
  return state.toLowerCase() === "running";
}

export function isContainerPaused(state: string): boolean {
  return state.toLowerCase() === "paused";
}

export function composeProjectFromLabels(labels: string): string | undefined {
  const match = labels.match(/(?:^|,)com\.docker\.compose\.project=([^,]+)/);
  return match?.[1];
}
