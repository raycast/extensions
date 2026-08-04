/**
 * Docker recovery for a local Karakeep instance.
 *
 * Scope: find the container serving the configured port, start it (or its whole
 * Compose project), and wait until the API answers. Everything is best-effort —
 * Docker is an optional convenience, never a dependency, so every failure here
 * degrades to "we couldn't help" rather than surfacing as a Karakeep error.
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { logger } from "@chrismessina/raycast-logger";
import { isApiReachable } from "./connection";

const execFileAsync = promisify(execFile);
const log = logger.child("[Docker]");

/**
 * Raycast spawns commands without the user's interactive shell PATH, so `docker`
 * is frequently not resolvable by name even when it works fine in Terminal.
 * These are the standard install locations, most common first.
 */
const DOCKER_PATHS = [
  "/usr/local/bin/docker",
  "/opt/homebrew/bin/docker",
  "/Applications/Docker.app/Contents/Resources/bin/docker",
  "/usr/bin/docker",
];

const EXEC_TIMEOUT_MS = 10_000;

export interface DockerContainer {
  name: string;
  status: string;
  project?: string;
  service?: string;
  running: boolean;
}

let cachedDockerPath: string | null | undefined;

/** Absolute path to the docker CLI, or null when it isn't installed. */
export function findDockerPath(): string | null {
  if (cachedDockerPath !== undefined) return cachedDockerPath;
  cachedDockerPath = DOCKER_PATHS.find((candidate) => existsSync(candidate)) ?? null;
  return cachedDockerPath;
}

async function docker(args: string[], timeout = EXEC_TIMEOUT_MS): Promise<string> {
  const bin = findDockerPath();
  if (!bin) throw new Error("Docker CLI not found");
  const { stdout } = await execFileAsync(bin, args, { timeout });
  return stdout.trim();
}

/**
 * Whether the Docker daemon is responsive. The CLI can exist while Docker
 * Desktop is closed, in which case every other call hangs then fails — so this
 * gates the rest and gets a short timeout of its own.
 */
export async function isDockerRunning(): Promise<boolean> {
  try {
    await docker(["info", "--format", "{{.ServerVersion}}"], 5_000);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find the container publishing `port` on the host.
 *
 * Note: `docker ps --filter publish=<port>` matches only ACTIVELY published
 * ports, so it returns nothing for a stopped container — precisely the case we
 * care about. Inspecting the declared `HostConfig.PortBindings` is what works
 * when the container is down.
 */
export async function findContainerByPort(port: string): Promise<DockerContainer | undefined> {
  try {
    const ids = await docker(["ps", "-aq"]);
    if (!ids) return undefined;

    const format = [
      "{{.Name}}",
      "{{.State.Status}}",
      '{{index .Config.Labels "com.docker.compose.project"}}',
      '{{index .Config.Labels "com.docker.compose.service"}}',
      "{{range $p, $b := .HostConfig.PortBindings}}{{range $b}}{{.HostPort}},{{end}}{{end}}",
    ].join("|");

    const output = await docker(["inspect", ...ids.split("\n"), "--format", format]);

    for (const line of output.split("\n")) {
      const [name, status, project, service, ports] = line.split("|");
      if (!ports) continue;
      if (!ports.split(",").filter(Boolean).includes(port)) continue;

      return {
        // `docker inspect` reports names with a leading slash.
        name: name.replace(/^\//, ""),
        status,
        project: project || undefined,
        service: service || undefined,
        running: status === "running",
      };
    }
  } catch (error) {
    log.log("Container lookup failed", { port, error: String(error) });
  }
  return undefined;
}

/**
 * Start the container, preferring its whole Compose project.
 *
 * Karakeep's stock deployment is a Compose project (web + meilisearch +
 * chrome). Starting only the web container yields a half-working instance that
 * answers HTTP but cannot search or crawl — worse than being clearly down,
 * because it looks fixed. So when the container carries Compose labels, start
 * every container in the project.
 */
export async function startContainer(container: DockerContainer): Promise<void> {
  if (container.project) {
    const siblings = await docker(["ps", "-aq", "--filter", `label=com.docker.compose.project=${container.project}`]);
    const ids = siblings.split("\n").filter(Boolean);
    if (ids.length > 0) {
      log.info("Starting Compose project", { project: container.project, containers: ids.length });
      // 60s: pulling nothing, but a cold multi-service start is not instant.
      await docker(["start", ...ids], 60_000);
      return;
    }
  }

  log.info("Starting container", { name: container.name });
  await docker(["start", container.name], 60_000);
}

/**
 * Poll until the API answers, or give up.
 *
 * A started container is not a ready one — Karakeep's web service takes a few
 * seconds to bind. Returning as soon as `docker start` exits would send the
 * user straight back into the same connection error, so we wait for a real
 * response. Any HTTP status counts: a 401 still proves the server is up.
 */
export async function waitForApi(apiUrl: string, timeoutMs = 60_000, intervalMs = 1_500): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isApiReachable(apiUrl)) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}
