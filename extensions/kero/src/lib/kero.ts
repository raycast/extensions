import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { delimiter, isAbsolute, join } from "node:path";
import { parseProjects, parseSessions, Session } from "./model";
import { newSessionArgs, NewSessionInput } from "./new-session";

export type KeroErrorKind =
  "missing-cli" | "missing-target" | "unreachable" | "timeout" | "invalid-data" | "failed" | "creation-uncertain";

export class KeroError extends Error {
  constructor(
    public readonly kind: KeroErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "KeroError";
  }
}

export function localEnvironment(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env = { ...source };
  delete env.KERO_HOST;
  delete env.KERO_SESSION;
  delete env.KERO_PANE;
  return env;
}

export async function resolveKeroPath(preference?: string, path = process.env.PATH || ""): Promise<string> {
  const configured = preference?.trim();
  const expanded = configured?.startsWith("~/") ? join(homedir(), configured.slice(2)) : configured;
  if (expanded && !isAbsolute(expanded)) {
    throw new KeroError(
      "missing-cli",
      "Set Kero CLI Path to an absolute executable path, such as /usr/local/bin/kero.",
    );
  }
  const candidates = expanded
    ? [expanded]
    : [
        "/usr/local/bin/kero",
        "/opt/homebrew/bin/kero",
        ...path
          .split(delimiter)
          .filter(isAbsolute)
          .map((dir) => join(dir, "kero")),
      ];
  for (const candidate of new Set(candidates)) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next known location, but never silently ignore an explicit preference.
    }
  }
  throw new KeroError(
    "missing-cli",
    expanded
      ? `Cannot execute ${expanded}. Check Kero CLI Path in extension preferences.`
      : "Kero CLI was not found. Install Kero, or set Kero CLI Path in extension preferences.",
  );
}

export function runKero(binary: string, args: string[], signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      binary,
      args,
      { env: localEnvironment(), cwd: homedir(), timeout: 8_000, maxBuffer: 8 * 1024 * 1024, encoding: "utf8", signal },
      (error, stdout, stderr) => {
        if (!error) return resolve(stdout);
        if (error.name === "AbortError") return reject(error);
        const detail = stderr.trim().slice(0, 500);
        if (error.code === "ENOENT" || error.code === "EACCES") {
          return reject(
            new KeroError("missing-cli", "Cannot execute Kero. Check Kero CLI Path in extension preferences."),
          );
        }
        if (error.code === 3) {
          return reject(
            new KeroError("missing-target", "This pane no longer exists or is ambiguous. Refresh the session list."),
          );
        }
        if (error.code === 4) {
          return reject(new KeroError("unreachable", "Cannot reach kerod. Open Kero and try again."));
        }
        if (error.killed) return reject(new KeroError("timeout", "Kero did not respond within 8 seconds. Try again."));
        reject(new KeroError("failed", detail || error.message));
      },
    );
  });
}

function parseJson(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    throw new KeroError("invalid-data", "Kero returned invalid JSON. Check your Kero installation and version.");
  }
}

export class KeroClient {
  private binary?: Promise<string>;

  constructor(private readonly preference?: string) {}

  private async run(args: string[], signal?: AbortSignal): Promise<string> {
    this.binary ??= resolveKeroPath(this.preference).catch((error: unknown) => {
      this.binary = undefined;
      throw error;
    });
    const binary = await this.binary;
    return runKero(binary, args, signal);
  }

  async sessions(signal?: AbortSignal) {
    return parseSessions(parseJson(await this.run(["ls", "--json"], signal)));
  }

  async projects(signal?: AbortSignal) {
    return parseProjects(parseJson(await this.run(["projects", "--json"], signal)));
  }

  async createSession(input: NewSessionInput): Promise<Session> {
    // Refresh selected projects before creation: unknown --project values create
    // new projects in Kero instead of failing. Directory validation is local.
    const projects = input.projectId ? await this.projects() : [];
    const args = await newSessionArgs(input, projects);
    let output: string;
    try {
      // Do not abort a mutation on view unmount: killing its CLI cannot undo it.
      // Do not use --focus: Kero ignores select errors for that flag.
      output = await this.run(args);
    } catch (reason) {
      if (reason instanceof KeroError && reason.kind === "missing-cli") throw reason;
      throw new KeroError(
        "creation-uncertain",
        "Creation could not be confirmed. Check Search Kero Sessions before creating another session. " +
          (reason instanceof KeroError && reason.kind === "timeout"
            ? "Kero did not respond within 8 seconds."
            : reason instanceof Error
              ? reason.message
              : String(reason)),
      );
    }
    try {
      const [session] = parseSessions([parseJson(output)]);
      const validId = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
      if (session.panes.length !== 1 || !validId.test(session.id) || !validId.test(session.panes[0].id)) {
        throw new Error("Invalid new session response");
      }
      return session;
    } catch {
      throw new KeroError(
        "creation-uncertain",
        "Kero returned an unexpected creation response. The session may already exist. Check Search Kero Sessions before creating another session.",
      );
    }
  }

  async focus(paneId: string, signal?: AbortSignal) {
    // IDs come from validated JSON, not user input. Never use a session-name fallback.
    if (!paneId || paneId.startsWith("-")) throw new KeroError("missing-target", "Invalid pane ID. Refresh the list.");
    await this.run(["focus", paneId], signal);
  }
}
