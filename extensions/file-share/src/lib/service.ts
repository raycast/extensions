import { environment } from "@raycast/api";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { findPortOwner, findPortOwners } from "./port-owner";
import {
  CONTROL_PORT,
  EXTENSION_ID,
  type ActionResult,
  type PortOwner,
  type ProbeResult,
  type ServiceConfig,
  type ServiceStatus,
} from "./types";

/** Long enough for a local process to answer, short enough that the panel never appears to hang. */
const PROBE_TIMEOUT_MS = 800;
const STARTUP_TIMEOUT_MS = 4000;
const SHUTDOWN_TIMEOUT_MS = 2500;

type ControlResponse =
  | { kind: "response"; statusCode: number; body: string }
  | { kind: "refused" }
  | { kind: "timeout" }
  | { kind: "error"; message: string };

export function serviceScriptPath(): string {
  return path.join(environment.assetsPath, "service", "server.js");
}

export function conflictMessage(
  port: number,
  owner: PortOwner | undefined,
): string {
  if (!owner) return `Port ${port} is already in use by another program.`;
  return `Port ${port} is already in use by ${owner.command} (pid ${owner.pid}).`;
}

/** Talks to the control plane. Only 127.0.0.1, only our own port. */
async function requestControl(
  method: "GET" | "POST" | "DELETE",
  pathname: string,
  body?: unknown,
  timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<ControlResponse> {
  const payload =
    body === undefined ? undefined : Buffer.from(JSON.stringify(body), "utf8");
  return await new Promise((resolve) => {
    let settled = false;
    const finish = (value: ControlResponse) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const request = http.request(
      {
        host: "127.0.0.1",
        port: CONTROL_PORT,
        path: pathname,
        method,
        agent: false,
        headers: {
          connection: "close",
          ...(payload
            ? {
                "content-type": "application/json",
                "content-length": payload.length,
              }
            : {}),
        },
      },
      (response) => {
        let text = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          text += chunk;
        });
        response.on("end", () =>
          finish({
            kind: "response",
            statusCode: response.statusCode ?? 0,
            body: text,
          }),
        );
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy();
      finish({ kind: "timeout" });
    });
    request.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ECONNREFUSED" || error.code === "ECONNRESET")
        finish({ kind: "refused" });
      else
        finish({
          kind: "error",
          message: error.code
            ? `${error.code}: ${error.message}`
            : error.message,
        });
    });
    if (payload) request.write(payload);
    request.end();
  });
}

export type ControlOutcome<T> =
  | { ok: true; data: T }
  /** Nothing is listening on the control port: the caller has to fall back to the file. */
  | { ok: false; reason: "unreachable" }
  /** The service answered, and refused: the caller must not work around that. */
  | { ok: false; reason: "error"; message: string };

/** One control-plane call, with the three outcomes the callers actually need to tell apart. */
export async function controlCall<T>(
  method: "GET" | "POST" | "DELETE",
  pathname: string,
  body?: unknown,
): Promise<ControlOutcome<T>> {
  const response = await requestControl(method, pathname, body);
  if (response.kind !== "response") return { ok: false, reason: "unreachable" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    parsed = undefined;
  }
  if (response.statusCode >= 300) {
    const message =
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { error?: unknown }).error === "string"
        ? String((parsed as { error: string }).error)
        : `The service answered with ${response.statusCode}`;
    return { ok: false, reason: "error", message };
  }
  return { ok: true, data: parsed as T };
}

/**
 * Asks the control plane who is listening. The answer decides between four outcomes: our service, a stranger on
 * the port, clearly nothing, and a state we cannot know (which must never be read as "not running").
 */
export async function probe(): Promise<ProbeResult> {
  const response = await requestControl("GET", "/status");
  if (response.kind === "refused") return { state: "stopped" };
  if (response.kind === "timeout") {
    return {
      state: "unknown",
      message: `The control port did not answer within ${PROBE_TIMEOUT_MS}ms.`,
    };
  }
  if (response.kind === "error")
    return { state: "unknown", message: response.message };

  if (response.statusCode === 200) {
    const status = parseStatus(response.body);
    if (status) return { state: "running", status };
  }
  return {
    state: "conflict",
    port: CONTROL_PORT,
    owner: await findPortOwner(CONTROL_PORT),
  };
}

function parseStatus(body: string): ServiceStatus | undefined {
  try {
    const status = JSON.parse(body) as ServiceStatus;
    return status.extension === EXTENSION_ID ? status : undefined;
  } catch {
    return undefined;
  }
}

export async function startService(
  config: ServiceConfig,
): Promise<ActionResult> {
  const before = await probe();
  if (before.state === "running") {
    return { ok: true, message: `Already sharing at ${before.status.address}` };
  }
  if (before.state === "conflict") {
    return { ok: false, message: conflictMessage(before.port, before.owner) };
  }
  if (before.state === "unknown") {
    return {
      ok: false,
      message: `The current state is unclear: ${before.message}`,
    };
  }

  // Detached so the service outlives this command, which Raycast unloads as soon as the window closes.
  const child = spawn(
    process.execPath,
    [serviceScriptPath(), environment.supportPath],
    {
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await delay(250);
    const result = await probe();
    if (result.state === "running")
      return { ok: true, message: `Sharing at ${result.status.address}` };
    if (result.state === "conflict") {
      return { ok: false, message: conflictMessage(result.port, result.owner) };
    }
  }

  // Nothing came up. The data port is the usual suspect: another program already holds it, so the service exits.
  const owner = await findPortOwner(config.port);
  if (owner) return { ok: false, message: conflictMessage(config.port, owner) };
  const finalProbe = await probe();
  return {
    ok: false,
    message:
      finalProbe.state === "unknown"
        ? `The service did not come up: ${finalProbe.message}`
        : "The service did not come up. Check the port and try again.",
  };
}

export async function stopService(): Promise<ActionResult> {
  const before = await probe();
  if (before.state === "stopped")
    return { ok: true, message: "Sharing is already stopped" };
  if (before.state === "conflict") {
    return { ok: false, message: conflictMessage(before.port, before.owner) };
  }

  const owners = await findPortOwners(CONTROL_PORT);
  const pids = new Set<number>(owners.map((owner) => owner.pid));
  if (before.state === "running") pids.add(before.status.pid);

  await requestControl("POST", "/stop", undefined, 1500);
  if (await waitForStop(SHUTDOWN_TIMEOUT_MS))
    return { ok: true, message: "Sharing stopped" };

  for (const pid of pids) signal(pid, "SIGTERM");
  if (await waitForStop(1500)) return { ok: true, message: "Sharing stopped" };

  for (const pid of pids) signal(pid, "SIGKILL");
  if (await waitForStop(1500)) return { ok: true, message: "Sharing stopped" };

  return {
    ok: false,
    message: "The service is still listening. Stop it from Activity Monitor.",
  };
}

export async function restartService(
  config: ServiceConfig,
): Promise<ActionResult> {
  const stopped = await stopService();
  if (!stopped.ok) return stopped;
  return startService(config);
}

/** One check from the host itself, so a listener that never became reachable does not look like success. */
export async function checkDataPlane(status: ServiceStatus): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const request = http.request(
      {
        host: status.host,
        port: status.port,
        path: "/api/list",
        method: "GET",
        agent: false,
      },
      (response) => {
        response.resume();
        resolve((response.statusCode ?? 0) < 400);
      },
    );
    request.setTimeout(1500, () => request.destroy());
    request.on("error", () => resolve(false));
    request.end();
  });
}

async function waitForStop(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await probe();
    if (result.state === "stopped") return true;
    await delay(200);
  }
  return false;
}

function signal(pid: number, name: NodeJS.Signals): void {
  try {
    process.kill(pid, name);
  } catch {
    // The process is already gone.
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
