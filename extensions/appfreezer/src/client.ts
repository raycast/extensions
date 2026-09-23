import { join } from "node:path";
import { AgentAction, buildActionURL, InstalledApplication, locateAppFreezerPath } from "./bridge-helpers";
import { actionError, actionOutcome, AgentSnapshot, parseSnapshot, ProtocolError } from "./protocol";

export const ACTION_TIMEOUT_MS = 3_000;
export const ACTION_WAIT_TIMEOUT_MS = ACTION_TIMEOUT_MS + 1_000;

export class AppFreezerNotInstalledError extends Error {
  constructor() {
    super("Install App Freezer 0.1.0 or newer to use this extension.");
    this.name = "AppFreezerNotInstalledError";
  }
}

export class AppFreezerCLIMissingError extends Error {
  constructor() {
    super("The installed App Freezer does not include appfreezerctl. Update App Freezer.");
    this.name = "AppFreezerCLIMissingError";
  }
}

export class AgentLaunchError extends Error {
  constructor(message?: string) {
    super(message ? `Could not launch the App Freezer agent: ${message}` : "Could not launch the App Freezer agent.");
    this.name = "AgentLaunchError";
  }
}

export class AgentConnectionError extends Error {
  constructor(message: string) {
    super(`Could not contact the App Freezer agent: ${message}`);
    this.name = "AgentConnectionError";
  }
}

export class AgentTimeoutError extends Error {
  constructor() {
    super(`App Freezer did not confirm the request within ${ACTION_TIMEOUT_MS / 1_000} seconds.`);
    this.name = "AgentTimeoutError";
  }
}

interface CLIResult {
  stdout: string;
  stderr?: string;
}

export interface AppFreezerClientDependencies {
  getInstalledApplications(): Promise<readonly InstalledApplication[]>;
  accessFile(path: string): Promise<void>;
  runCLI(path: string, arguments_: string[], timeoutMs: number): Promise<CLIResult>;
  openURL(url: string): Promise<void>;
  makeRequestID(): string;
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr.trim() : "";
  return stderr || error.message;
}

function isTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const candidate = error as Error & { code?: string; killed?: boolean };
  return (
    candidate.code === "ETIMEDOUT" ||
    candidate.killed === true ||
    new RegExp(`did not respond within ${ACTION_TIMEOUT_MS / 1_000} seconds|timed? out`, "i").test(errorText(error))
  );
}

export function createAppFreezerClient(dependencies: AppFreezerClientDependencies) {
  let operationQueue: Promise<void> = Promise.resolve();

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = operationQueue.then(operation);
    operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function appFreezerCLIPath(): Promise<string> {
    let applications: readonly InstalledApplication[];
    try {
      applications = await dependencies.getInstalledApplications();
    } catch (error) {
      throw new AgentConnectionError(errorText(error));
    }
    const appPath = locateAppFreezerPath(applications);
    if (!appPath) throw new AppFreezerNotInstalledError();
    const cliPath = join(appPath, "Contents", "MacOS", "appfreezerctl");
    try {
      await dependencies.accessFile(cliPath);
    } catch {
      throw new AppFreezerCLIMissingError();
    }
    return cliPath;
  }

  async function runAndParse(cliPath: string, arguments_: string[], timeoutMs: number): Promise<AgentSnapshot> {
    try {
      const { stdout } = await dependencies.runCLI(cliPath, arguments_, timeoutMs);
      return parseSnapshot(stdout);
    } catch (error) {
      if (error instanceof ProtocolError || error instanceof AgentTimeoutError) throw error;
      if (isTimeout(error)) throw new AgentTimeoutError();
      throw new AgentConnectionError(errorText(error));
    }
  }

  async function loadSnapshotNow(): Promise<AgentSnapshot> {
    const cliPath = await appFreezerCLIPath();
    return runAndParse(cliPath, ["list", "--json"], 5_000);
  }

  function loadSnapshot(): Promise<AgentSnapshot> {
    return enqueue(loadSnapshotNow);
  }

  async function waitForAction(cliPath: string, requestID: string): Promise<AgentSnapshot> {
    return runAndParse(cliPath, ["wait", "--request-id", requestID, "--json"], ACTION_WAIT_TIMEOUT_MS);
  }

  async function performActionNow(action: AgentAction, id?: string): Promise<AgentSnapshot> {
    if ((action === "pause" || action === "resume" || action === "quit" || action === "force-quit") && !id) {
      throw new Error(`The ${action} action requires an application ID.`);
    }
    const requestID = dependencies.makeRequestID();
    const cliPath = await appFreezerCLIPath();
    try {
      await dependencies.openURL(buildActionURL(action, requestID, id));
    } catch (error) {
      throw new AgentLaunchError(errorText(error));
    }
    const snapshot = await waitForAction(cliPath, requestID);
    const outcome = actionOutcome(snapshot.lastAction, requestID);
    if (outcome === "success") return snapshot;
    if (outcome === "error" && snapshot.lastAction) throw new Error(actionError(snapshot.lastAction));
    throw new AgentTimeoutError();
  }

  function performAction(action: AgentAction, id?: string): Promise<AgentSnapshot> {
    return enqueue(() => performActionNow(action, id));
  }

  async function openSettings(): Promise<void> {
    try {
      await dependencies.openURL(buildActionURL("settings"));
    } catch (error) {
      throw new AgentLaunchError(errorText(error));
    }
  }

  return { loadSnapshot, performAction, openSettings };
}
