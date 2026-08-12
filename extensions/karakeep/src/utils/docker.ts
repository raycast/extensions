/**
 * Docker recovery for a local Karakeep instance.
 *
 * Scope: find the container serving the configured port, start it (or its whole
 * Compose project), and wait until the API answers. Everything is best-effort —
 * Docker is an optional convenience, never a dependency, so every failure here
 * degrades to "we couldn't help" rather than surfacing as a Karakeep error.
 */

import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { join } from "path";
import { logger } from "@chrismessina/raycast-logger";
import { isApiReachable } from "./connection";
import { composeArgs, publishesLoopbackPort, STARTABLE_STATES } from "./compose";

const execFileAsync = promisify(execFile);
const log = logger.child("[Docker]");

/**
 * Raycast spawns commands without the user's interactive shell PATH, so `docker`
 * is frequently not resolvable by name even when it works fine in Terminal.
 * These are the standard install locations, most common first.
 *
 * The manifest declares Windows support, so the Windows locations have to be
 * here too — a macOS-only list does not fail loudly on Windows, it silently
 * reports "Docker isn't installed" to everyone running one.
 */
const DOCKER_PATHS: Record<string, string[]> = {
  darwin: [
    "/usr/local/bin/docker",
    "/opt/homebrew/bin/docker",
    "/Applications/Docker.app/Contents/Resources/bin/docker",
    "/usr/bin/docker",
  ],
  win32: [
    // Per-user install is Docker Desktop's default and lands under LOCALAPPDATA,
    // which is often absent from the PATH Raycast inherits.
    ...(process.env.LOCALAPPDATA
      ? [join(process.env.LOCALAPPDATA, "Programs", "DockerDesktop", "resources", "bin", "docker.exe")]
      : []),
    "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe",
    "C:\\ProgramData\\DockerDesktop\\version-bin\\docker.exe",
  ],
  linux: ["/usr/bin/docker", "/usr/local/bin/docker", "/snap/bin/docker"],
};

/** Directories on the inherited PATH, as a fallback for non-standard installs. */
function pathCandidates(): string[] {
  const binary = process.platform === "win32" ? "docker.exe" : "docker";
  const entries = (process.env.PATH ?? "").split(process.platform === "win32" ? ";" : ":");
  return entries.filter(Boolean).map((dir) => join(dir, binary));
}

const EXEC_TIMEOUT_MS = 10_000;

/**
 * Field separator for `docker inspect --format`. A pipe seemed safe until you
 * remember one of the fields is a filesystem path the user chose — a compose
 * file under `/Users/me/a|b/` would truncate and produce an invalid `-f` path.
 * U+001F is the ASCII unit separator; it cannot occur in a path or label.
 */
const FIELD_SEP = "\u001f";

/** Ceiling on the buffered compose transcript. Only its tail is ever read. */
const MAX_TRANSCRIPT_CHARS = 100_000;

/** Ceiling on a single un-terminated line held back waiting for its newline. */
const MAX_PENDING_CHARS = 8_000;

export interface DockerContainer {
  name: string;
  status: string;
  project?: string;
  service?: string;
  running: boolean;
  /** Whether `docker start` can actually act on it. Not the inverse of
   * `running`: paused needs unpause, restarting is already trying, and
   * dead/removing cannot be started at all. */
  startable: boolean;
  /** Image reference as declared, e.g. ghcr.io/karakeep-app/karakeep:release */
  image?: string;
  /** Compose file(s) this project was created from, needed to run compose
   * against it from outside its directory. */
  configFiles?: string[];
  /** The directory Compose treated as the project root. Relative paths inside
   * the compose file (`env_file: - .env`) resolve against THIS, not the cwd. */
  workingDir?: string;
}

let cachedDockerPath: string | null | undefined;

/** Absolute path to the docker CLI, or null when it isn't installed. */
export function findDockerPath(): string | null {
  if (cachedDockerPath !== undefined) return cachedDockerPath;
  const known = DOCKER_PATHS[process.platform] ?? DOCKER_PATHS.linux;
  cachedDockerPath = [...known, ...pathCandidates()].find((candidate) => existsSync(candidate)) ?? null;
  if (!cachedDockerPath) log.log("Docker CLI not found", { platform: process.platform });
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
export async function findContainersByPort(port: string): Promise<DockerContainer[]> {
  try {
    const ids = await docker(["ps", "-aq"]);
    if (!ids) return [];

    const format = [
      "{{.Name}}",
      "{{.State.Status}}",
      '{{index .Config.Labels "com.docker.compose.project"}}',
      '{{index .Config.Labels "com.docker.compose.service"}}',
      "{{range $p, $b := .HostConfig.PortBindings}}{{range $b}}{{$p}}@{{.HostIp}}@{{.HostPort}},{{end}}{{end}}",
      "{{.Config.Image}}",
      '{{index .Config.Labels "com.docker.compose.project.config_files"}}',
      '{{index .Config.Labels "com.docker.compose.project.working_dir"}}',
    ].join(FIELD_SEP);

    const output = await docker(["inspect", ...ids.split("\n"), "--format", format]);

    const matches: DockerContainer[] = [];
    for (const line of output.split("\n")) {
      const [name, status, project, service, ports, image, configFiles, workingDir] = line.split(FIELD_SEP);
      if (!ports) continue;
      if (!publishesLoopbackPort(ports, port)) continue;

      matches.push({
        // `docker inspect` reports names with a leading slash.
        name: name.replace(/^\//, ""),
        status,
        project: project || undefined,
        service: service || undefined,
        running: status === "running",
        startable: STARTABLE_STATES.has(status),
        image: image || undefined,
        // Docker stores multiple compose files comma-separated, so a path
        // containing a comma is not representable here — Docker's limitation,
        // not ours.
        configFiles: configFiles ? configFiles.split(",").filter(Boolean) : undefined,
        workingDir: workingDir || undefined,
      });
    }

    if (matches.length > 1) {
      log.info("Several containers declare this port", {
        port,
        candidates: matches.map((m) => ({ name: m.name, project: m.project, running: m.running })),
      });
    }

    return matches;
  } catch (error) {
    log.log("Container lookup failed", { port, error: String(error) });
  }
  return [];
}

/**
 * The single container to act on for a NON-destructive caller (offline
 * recovery). A running candidate wins because it is the one actually holding
 * the port; a stopped leftover from an unrelated project declares it just as
 * well.
 *
 * Destructive callers must NOT use this — recreating a Compose project is not
 * something to do on a best guess. Use findContainersByPort and refuse when the
 * answer is ambiguous.
 */
export async function findContainerByPort(port: string): Promise<DockerContainer | undefined> {
  const matches = await findContainersByPort(port);
  return matches.find((match) => match.running) ?? matches[0];
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
    // Only the siblings that need starting AND can be started:
    //   status=exited/created — a running container is a no-op at best, and
    //     paused/dead/restarting make `docker start` fail the whole batch
    //   oneoff=False — `docker compose run` leftovers are not services; they
    //     are one-shot commands that would re-execute
    const siblings = await docker([
      "ps",
      "-aq",
      "--filter",
      `label=com.docker.compose.project=${container.project}`,
      "--filter",
      "label=com.docker.compose.oneoff=False",
      "--filter",
      "status=exited",
      "--filter",
      "status=created",
    ]);
    const ids = siblings.split("\n").filter(Boolean);
    if (ids.length > 0) {
      log.info("Starting Compose project", { project: container.project, containers: ids.length });
      // 60s: pulling nothing, but a cold multi-service start is not instant.
      await docker(["start", ...ids], 60_000);
      return;
    }
    log.log("No startable containers in project; falling back to the one we found", {
      project: container.project,
      name: container.name,
    });
  }

  if (!container.startable) {
    throw new Error(`Container ${container.name} is ${container.status} and cannot be started`);
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

/**
 * Resolved image IDs for every container in a Compose project, keyed by name.
 *
 * Per-PROJECT rather than per-container because Karakeep is three services and
 * any of them can be the one that moved: comparing only the web container
 * reported "already current" for an update that had in fact pulled a new
 * meilisearch or chrome image.
 *
 * Returns undefined — rather than an empty map — when the IDs can't be read, so
 * the caller can tell "nothing changed" apart from "I don't know".
 */
export async function readProjectImageIds(container: DockerContainer): Promise<Map<string, string> | undefined> {
  try {
    const filter = container.project
      ? ["ps", "-aq", "--filter", `label=com.docker.compose.project=${container.project}`]
      : undefined;
    const ids = filter ? await docker(filter) : container.name;
    const targets = ids.split("\n").filter(Boolean);
    if (targets.length === 0) return undefined;

    const output = await docker(["inspect", ...targets, "--format", `{{.Name}}${FIELD_SEP}{{.Image}}`]);
    const byName = new Map<string, string>();
    for (const line of output.split("\n")) {
      const [name, imageId] = line.split(FIELD_SEP);
      if (name && imageId) byName.set(name.replace(/^\//, ""), imageId);
    }
    return byName.size > 0 ? byName : undefined;
  } catch (error) {
    log.log("Could not read project image ids", { project: container.project, error: String(error) });
    return undefined;
  }
}

/**
 * Whether any image in the project changed. `undefined` means unknown — either
 * snapshot failed to read, so claiming "already current" would be a guess.
 */
export function imagesChanged(
  before: Map<string, string> | undefined,
  after: Map<string, string> | undefined,
): boolean | undefined {
  if (!before || !after) return undefined;
  for (const [name, id] of after) {
    const previous = before.get(name);
    // A container absent beforehand was created by this update, which counts.
    if (previous === undefined || previous !== id) return true;
  }
  return false;
}

/**
 * Run `docker compose up --pull always -d` for the container's project.
 *
 * Streams output through `onOutput` instead of buffering: a cold pull of the
 * Karakeep images takes minutes, and a screen that says nothing for that long
 * reads as a hang.
 *
 * Compose is invoked with `-f <config file>` rather than by changing directory,
 * because Raycast has no meaningful working directory — the compose file path
 * comes from the label Compose itself wrote when the project was created.
 */
export function composePullAndUp(
  container: DockerContainer,
  onOutput: (lines: string[]) => void,
  timeoutMs = 15 * 60_000,
): Promise<void> {
  const bin = findDockerPath();
  if (!bin) return Promise.reject(new Error("Docker CLI not found"));
  if (!container.configFiles?.length) {
    return Promise.reject(new Error("This container was not created by Docker Compose"));
  }

  const args = composeArgs(container);
  log.info("Running docker compose", { project: container.project, configFiles: container.configFiles, args });

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { timeout: timeoutMs });
    let transcript = "";
    let transcriptTruncated = false;

    // Chunks land on arbitrary byte boundaries, so a chunk ending mid-line
    // would otherwise be displayed as its own truncated line and the remainder
    // as a second one. Hold the tail back until its newline arrives — and keep
    // ONE buffer PER STREAM, because interleaving a half-line from stdout with
    // a whole line from stderr would splice them into a word that never
    // appeared in either.
    const pending = { stdout: "", stderr: "" };

    // Compose writes its progress to stderr and almost nothing to stdout, so
    // stderr here is progress, not necessarily an error.
    const collect = (stream: "stdout" | "stderr") => (chunk: Buffer) => {
      const text = chunk.toString();

      // A pathological run (a wedged pull retrying forever) would otherwise
      // grow this without bound; the tail is what names the failure anyway.
      if (transcript.length < MAX_TRANSCRIPT_CHARS) transcript += text;
      else transcriptTruncated = true;

      pending[stream] += text;
      const lines = pending[stream].split("\n");
      pending[stream] = lines.pop() ?? "";
      // A stream that never emits a newline would otherwise grow this forever;
      // the transcript cap above does not cover the pending tail.
      if (pending[stream].length > MAX_PENDING_CHARS) {
        onOutput([pending[stream].slice(0, MAX_PENDING_CHARS)]);
        pending[stream] = "";
      }
      const complete = lines.map((line) => line.trimEnd()).filter(Boolean);
      if (complete.length) onOutput(complete);
    };
    child.stdout.on("data", collect("stdout"));
    child.stderr.on("data", collect("stderr"));

    child.on("error", (error) => {
      log.error("Could not spawn docker compose", { error: String(error) });
      reject(error);
    });
    child.on("close", (code) => {
      // Compose's last line often has no trailing newline.
      const tail = [pending.stdout.trim(), pending.stderr.trim()].filter(Boolean);
      if (tail.length) onOutput(tail);
      if (transcriptTruncated) log.info("Compose output was truncated for logging", { keptChars: transcript.length });
      log.info("docker compose exited", { code, project: container.project });
      if (code === 0) resolve();
      // Reject with the WHOLE output. Slicing the last few lines here threw
      // away the one line that named the cause and kept "Interrupted" noise;
      // the caller summarizes for the toast and keeps the rest copyable.
      else reject(new Error(transcript.trim() || `docker compose exited with ${code}`));
    });
  });
}
