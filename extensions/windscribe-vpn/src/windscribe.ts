import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { isIP } from "node:net";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import lockfile from "proper-lockfile";

const exec = promisify(execFile);
const cliTimeoutMs = 20_000;

export type Status = {
  state: "connected" | "disconnected" | "connecting" | "disconnecting" | "signed-out" | "signing-in" | "failed";
  location?: string;
  protocol?: string;
  detail?: string;
};

type ErrorCode = "missing" | "busy" | "unreachable" | "unknown-status" | "command-failed" | "unconfirmed";

export class WindscribeError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "WindscribeError";
  }
}

export async function findWindscribeApp(): Promise<string> {
  for (const app of ["/Applications/Windscribe.app", join(homedir(), "Applications", "Windscribe.app")]) {
    try {
      await access(join(app, "Contents", "MacOS", "windscribe-cli"), constants.X_OK);
      return app;
    } catch {
      // Try the next standard macOS application directory.
    }
  }
  throw new WindscribeError("missing", "Install the Windscribe desktop app in Applications and sign in.");
}

function visibleLines(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("{") && !line.startsWith("cli:"));
}

function locationName(value: string | undefined): string | undefined {
  const name = value?.trim();
  // Older versions append the VPN IP to the location, which the status view doesn't need.
  const separator = name?.lastIndexOf(" - ") ?? -1;
  if (name && separator >= 0 && isIP(name.slice(separator + 3))) {
    return name.slice(0, separator).trim() || undefined;
  }
  return name || undefined;
}

export function parseStatus(output: string): Status {
  const fields = new Map<string, string>();
  for (const line of visibleLines(output)) {
    const separator = line.indexOf(":");
    if (separator > 0) {
      fields.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
    }
  }
  const login = fields.get("login") ?? fields.get("login state");
  const legacyTunnelCheck = fields.get("*connect state");
  const connection = fields.get("connection") ?? fields.get("connect state") ?? legacyTunnelCheck ?? "";
  const protocol = fields.get("protocol") || undefined;

  if (/^logged out$/i.test(login ?? ""))
    return { state: "signed-out", detail: "Sign in to the Windscribe desktop app." };
  if (/^logging in$/i.test(login ?? ""))
    return { state: "signing-in", detail: "Wait for Windscribe to finish signing in." };
  if (/^error:/i.test(login ?? "")) {
    return { state: "signed-out", detail: "Open the Windscribe desktop app to check your sign-in." };
  }

  if (/^logged in$/i.test(login ?? "")) {
    if (/^disconnected$/i.test(connection)) return { state: "disconnected" };
    if (/^disconnecting$/i.test(connection)) return { state: "disconnecting" };

    const connecting = /^connecting(?:(?::\s*| to\s+)(.*))?$/i.exec(connection);
    if (connecting) return { state: "connecting", location: locationName(connecting[1]) };

    const checking = /\s+\(checking the connection\)$/i;
    const interference = /\s+(?:\[network interference\]|\(network interference detected\))$/i;
    const connected = /^connected(?:(?::| to)\s+(.+))?$/i.exec(
      connection.replace(checking, "").replace(interference, ""),
    );
    if (connected) {
      const location = locationName(connected[1]);
      if (legacyTunnelCheck || checking.test(connection)) {
        return { state: "connecting", location, protocol };
      }
      return {
        state: "connected",
        location,
        protocol,
        detail: interference.test(connection) ? "Windscribe detected network interference." : undefined,
      };
    }

    if (/^error:|^disconnected due to /i.test(connection)) {
      return { state: "failed", detail: connection.replace(/^error:\s*/i, "").slice(0, 220) };
    }
  }

  throw new WindscribeError(
    "unknown-status",
    "Open Windscribe to check the VPN. Raycast could not read its connection state.",
  );
}

type RunCli = (args: readonly string[], timeoutMs: number) => Promise<string>;

function cliError(output: string, timedOut: boolean): WindscribeError | undefined {
  const lines = visibleLines(output);
  if (lines.some((line) => /^windscribe cli is already running\.?$/i.test(line))) {
    return new WindscribeError("busy", "Windscribe is handling another request. Try again in a moment.");
  }
  if (timedOut || lines.some((line) => /^aborting: (app did not start|ipc communication error)/i.test(line))) {
    return new WindscribeError("unreachable", "Open Windscribe and try again. If it’s already open, restart the app.");
  }
  if (lines.some((line) => /^(?:error:\s*)?not logged in\.?$/i.test(line))) {
    return new WindscribeError("command-failed", "Sign in to the Windscribe desktop app, then try again.");
  }
  if (lines.some((line) => /^(?:dis)?connection has been overridden by another command\.?$/i.test(line))) {
    return new WindscribeError(
      "busy",
      "Another command changed the connection. Check Windscribe Status and try again.",
    );
  }
  const error = lines.find((line) => /^error:\s*.+/i.test(line));
  if (error) {
    return new WindscribeError("command-failed", error.replace(/^error:\s*/i, "").slice(0, 220));
  }
}

const runCli: RunCli = async (args, timeout) => {
  const app = await findWindscribeApp();
  let output: string;
  let failed = false;
  let timedOut = false;
  try {
    const { stdout, stderr } = await exec(join(app, "Contents", "MacOS", "windscribe-cli"), [...args], {
      encoding: "utf8",
      killSignal: "SIGKILL",
      maxBuffer: 128 * 1024,
      timeout,
    });
    output = `${stdout}\n${stderr}`;
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; killed?: boolean; code?: string | number };
    if (failure.code === "ENOENT") {
      throw new WindscribeError("missing", "Install the Windscribe desktop app in Applications and sign in.");
    }
    output = `${failure.stdout ?? ""}\n${failure.stderr ?? ""}`;
    failed = true;
    timedOut = Boolean(failure.killed);
  }
  // Windscribe can finish disconnecting between our status read and its handling of the command.
  if (
    args[0] === "disconnect" &&
    visibleLines(output).some((line) => /^(?:error:\s*)?already disconnected\.?$/i.test(line))
  ) {
    return output;
  }
  const reported = cliError(output, timedOut);
  if (reported) throw reported;
  if (failed) throw new WindscribeError("command-failed", "Open Windscribe to check the app and try again.");
  return output;
};

export type Control = "connect" | "best" | "disconnect" | "toggle";

type ControlResult = {
  state: "connected" | "disconnected" | "in-progress" | "already-connected" | "already-disconnected";
  message?: string;
};

function requireSession(status: Status): void {
  if (status.state === "signed-out" || status.state === "signing-in" || status.state === "failed") {
    throw new WindscribeError("command-failed", status.detail ?? "Open Windscribe to check the VPN.");
  }
}

export function createWindscribe(
  supportPath: string,
  { run = runCli, confirmationTimeoutMs = 60_000, pollIntervalMs = 1_000 } = {},
) {
  async function withLock<T>(operation: () => Promise<T>): Promise<T> {
    await mkdir(supportPath, { recursive: true });
    let release: () => Promise<void>;
    try {
      release = await lockfile.lock(join(supportPath, "windscribe-operation"), { realpath: false });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ELOCKED") throw error;
      throw new WindscribeError("busy", "Another Raycast command is using Windscribe. Try again in a moment.");
    }
    try {
      return await operation();
    } finally {
      await release();
    }
  }

  async function readStatus(timeoutMs = cliTimeoutMs): Promise<Status> {
    return parseStatus(await run(["status"], timeoutMs));
  }

  async function confirm(target: "connected" | "disconnected"): Promise<ControlResult> {
    const deadline = performance.now() + confirmationTimeoutMs;
    while (true) {
      const remaining = deadline - performance.now();
      if (remaining <= 0) break;
      try {
        const status = await readStatus(Math.min(cliTimeoutMs, Math.ceil(remaining)));
        requireSession(status);
        if (status.state === target) {
          const message = [status.location, status.detail].filter(Boolean).join(" · ");
          return { state: target, message: message || undefined };
        }
      } catch (error) {
        // During a VPN change Windscribe can briefly return an unreadable status.
        // The request was already sent, so only retry the status read.
        if (!(error instanceof WindscribeError) || !["busy", "unreachable", "unknown-status"].includes(error.code)) {
          throw error;
        }
      }
      await delay(Math.max(0, Math.min(pollIntervalMs, deadline - performance.now())));
    }
    throw new WindscribeError(
      "unconfirmed",
      "Check Windscribe Status or the desktop app for the latest connection state.",
    );
  }

  return {
    status: () => withLock(() => readStatus()),
    control: (control: Control, onRequest: (action: "connect" | "disconnect") => void = () => {}) =>
      withLock(async (): Promise<ControlResult> => {
        const status = await readStatus();
        requireSession(status);
        if (status.state === "connecting" || status.state === "disconnecting") {
          return {
            state: "in-progress",
            message: status.state === "connecting" ? "Windscribe is connecting." : "Windscribe is disconnecting.",
          };
        }

        const disconnect = control === "disconnect" || (control === "toggle" && status.state === "connected");
        if (disconnect && status.state === "disconnected") return { state: "already-disconnected" };
        if (!disconnect && status.state === "connected") {
          const instruction = control === "best" ? "Disconnect first to use Best Location." : undefined;
          return {
            state: "already-connected",
            message: [status.location, instruction].filter(Boolean).join(" · ") || undefined,
          };
        }

        const action = disconnect ? "disconnect" : "connect";
        onRequest(action);
        await run(control === "best" ? ["connect", "-n", "best"] : [action, "-n"], cliTimeoutMs);
        return confirm(disconnect ? "disconnected" : "connected");
      }),
  };
}
