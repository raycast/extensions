import { existsSync } from "node:fs";
import { createConnection } from "node:net";
import { homedir } from "node:os";
import path from "node:path";

const SOCKET_PATH = path.join(
  homedir(),
  "Library",
  "Caches",
  "co.myrt.lockdock",
  "control.sock",
);

export interface DockStatus {
  displays: string[];
  location: number;
  target?: number;
}

export function isIpcRunning(): boolean {
  return existsSync(SOCKET_PATH);
}

export async function getState(): Promise<DockStatus> {
  return request({ cmd: "get_state" }).then(parseStatus);
}

export async function lockDock(target: number): Promise<void> {
  await request({ cmd: "set_state", target }).then(expectSuccess);
}

export async function unlockDock(): Promise<void> {
  await request({ cmd: "unlock" }).then(expectSuccess);
}

async function request(payload: Record<string, unknown>): Promise<unknown> {
  const response = await new Promise<string>((resolve, reject) => {
    const socket = createConnection(SOCKET_PATH);
    let output = "";

    socket.setEncoding("utf8");
    socket.once("connect", () => socket.end(`${JSON.stringify(payload)}\n`));
    socket.on("data", (chunk: string) => {
      output += chunk;
    });
    socket.once("end", () => resolve(output.trim()));
    socket.once("error", (error: NodeJS.ErrnoException) => {
      reject(formatConnectionError(error));
    });
  });

  if (response.length === 0) {
    throw new Error("lockdockd returned an empty response.");
  }

  try {
    return JSON.parse(response);
  } catch {
    throw new Error(`lockdockd returned invalid JSON: ${response}`);
  }
}

function parseStatus(response: unknown): DockStatus {
  if (isDaemonError(response)) {
    throw new Error(response.reason);
  }
  if (!isRecord(response)) {
    throw new Error("lockdock returned an invalid status payload.");
  }

  const { displays, location, target } = response;
  if (
    !Array.isArray(displays) ||
    !displays.every((display) => typeof display === "string")
  ) {
    throw new Error("lockdock returned displays in an unexpected format.");
  }
  if (typeof location !== "number") {
    throw new Error("lockdock returned location in an unexpected format.");
  }
  if (target !== undefined && typeof target !== "number") {
    throw new Error("lockdock returned target in an unexpected format.");
  }

  return { displays, location, target };
}

function expectSuccess(response: unknown): void {
  if (isRecord(response) && response.success === true) {
    return;
  }
  if (isDaemonError(response)) {
    throw new Error(response.reason);
  }
  throw new Error("lockdock returned an unexpected command response.");
}

function formatConnectionError(error: NodeJS.ErrnoException): Error {
  if (error.code === "ENOENT" || error.code === "ECONNREFUSED") {
    return new Error("Cannot connect to lockdock. Start daemon and try again.");
  }
  return new Error(error.message);
}

function isDaemonError(value: unknown): value is {
  success: false;
  reason: string;
} {
  return (
    isRecord(value) && value.success === false && typeof value.reason === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
