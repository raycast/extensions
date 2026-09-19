import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { ContainerRow, parseBytes } from "./model";
import { localContainerClient, stopWithClient } from "./container-control";
export { validateContainer } from "./container-control";

const execute = promisify(execFile);
const socket = join(homedir(), ".orbstack/run/docker.sock");
const format =
  '{"id":{{json .Id}},"startedAt":{{json .State.StartedAt}},"status":{{json .State.Status}},"stopSignal":{{json (index .Config "StopSignal")}},"name":{{json .Name}}}';
function lines<T>(text: string): T[] {
  return text.trim()
    ? text
        .trim()
        .split("\n")
        .map((s) => JSON.parse(s) as T)
    : [];
}
async function docker(args: string[], timeout = 8000) {
  if (!(await stat(socket).catch(() => null))?.isSocket())
    throw new Error(
      "OrbStack is not running or its local socket is unavailable",
    );
  const candidates = [
    "/usr/local/bin/docker",
    "/opt/homebrew/bin/docker",
    join(homedir(), ".orbstack/bin/docker"),
  ];
  let executable: string | undefined;
  for (const candidate of candidates) {
    if (
      await access(candidate).then(
        () => true,
        () => false,
      )
    ) {
      executable = candidate;
      break;
    }
  }
  if (!executable) throw new Error("Docker CLI was not found");
  const env = { ...process.env };
  for (const key of [
    "DOCKER_HOST",
    "DOCKER_CONTEXT",
    "DOCKER_TLS_VERIFY",
    "DOCKER_CERT_PATH",
  ])
    delete env[key];
  const result = await execute(
    executable,
    ["--host", `unix://${socket}`, ...args],
    { timeout, maxBuffer: 8 * 1024 * 1024, env },
  );
  return result.stdout;
}
export async function listContainers(): Promise<ContainerRow[]> {
  const ids = (await docker(["ps", "--quiet", "--no-trunc"]))
    .trim()
    .split("\n")
    .filter(Boolean);
  if (!ids.length) return [];
  if (!ids.every((id) => /^[a-f0-9]{64}$/.test(id)))
    throw new Error("Unexpected container identity");
  const [info, measurements] = await Promise.all([
    docker(["inspect", "--format", format, ...ids]),
    docker([
      "stats",
      "--no-stream",
      "--no-trunc",
      "--format",
      "{{json .}}",
      ...ids,
    ]),
  ]);
  const stats = new Map(
    lines<Record<string, string>>(measurements).map((s) => [s.ID, s]),
  );
  return lines<ContainerRow>(info).map((c) => {
    const s = stats.get(c.id),
      io = s?.BlockIO?.split("/") ?? [];
    const percent = s ? parseFloat(s.CPUPerc) : NaN;
    return {
      ...c,
      name: c.name.replace(/^\//, ""),
      stopSignal: c.stopSignal || "SIGTERM",
      memory: s ? parseBytes(s.MemUsage.split("/")[0]) : null,
      cpuPercent: Number.isFinite(percent) ? percent : null,
      readBytes: parseBytes(io[0] ?? ""),
      writeBytes: parseBytes(io[1] ?? ""),
    };
  });
}
export async function stopContainer(
  expected: ContainerRow,
  force: boolean,
): Promise<string> {
  if (!(await stat(socket).catch(() => null))?.isSocket())
    throw new Error(
      "OrbStack is not running or its local socket is unavailable",
    );
  const client = localContainerClient(socket);
  try {
    return await stopWithClient(expected, force, client.send);
  } finally {
    client.close();
  }
}
