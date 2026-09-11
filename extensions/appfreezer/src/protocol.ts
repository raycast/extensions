export const SUPPORTED_PROTOCOL_VERSION = 4;

export type ApplicationStatus = "running" | "paused";

export interface AppFreezerApplication {
  id: string;
  name: string;
  bundleIdentifier?: string;
  bundlePath?: string;
  cpuPercent: number;
  memoryPercent: number;
  status: ApplicationStatus;
  canPause: boolean;
  canQuit: boolean;
}

export interface LastAction {
  requestID: string;
  status: "succeeded" | "failed";
  message?: string;
}

export interface AgentSnapshot {
  protocolVersion: number;
  generatedAt: string;
  applications: AppFreezerApplication[];
  lastAction?: LastAction;
}

export class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseApplication(value: unknown, index: number): AppFreezerApplication {
  if (!isRecord(value)) {
    throw new ProtocolError(`Application ${index + 1} is not an object.`);
  }
  if (value.status !== "running" && value.status !== "paused") {
    throw new ProtocolError(`Application ${index + 1} has an unsupported status.`);
  }
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.cpuPercent !== "number" ||
    !Number.isFinite(value.cpuPercent) ||
    typeof value.memoryPercent !== "number" ||
    !Number.isFinite(value.memoryPercent) ||
    typeof value.canPause !== "boolean" ||
    typeof value.canQuit !== "boolean"
  ) {
    throw new ProtocolError(`Application ${index + 1} is missing required fields.`);
  }
  return {
    id: value.id,
    name: value.name,
    bundleIdentifier: typeof value.bundleIdentifier === "string" ? value.bundleIdentifier : undefined,
    bundlePath: typeof value.bundlePath === "string" ? value.bundlePath : undefined,
    cpuPercent: value.cpuPercent,
    memoryPercent: value.memoryPercent,
    status: value.status,
    canPause: value.canPause,
    canQuit: value.canQuit,
  };
}

export function parseSnapshot(input: string): AgentSnapshot {
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    throw new ProtocolError("App Freezer returned invalid JSON.");
  }
  if (!isRecord(value)) {
    throw new ProtocolError("App Freezer returned an invalid snapshot.");
  }
  if (value.protocolVersion !== SUPPORTED_PROTOCOL_VERSION) {
    throw new ProtocolError(
      `Unsupported App Freezer protocol version: ${String(value.protocolVersion)}. Install App Freezer 0.1.0 or newer and update the extension.`,
    );
  }
  if (typeof value.generatedAt !== "string" || !Array.isArray(value.applications)) {
    throw new ProtocolError("App Freezer snapshot is missing required fields.");
  }

  let lastAction: LastAction | undefined;
  if (value.lastAction !== undefined && value.lastAction !== null) {
    if (
      !isRecord(value.lastAction) ||
      typeof value.lastAction.requestID !== "string" ||
      (value.lastAction.status !== "succeeded" && value.lastAction.status !== "failed") ||
      (value.lastAction.message !== undefined && typeof value.lastAction.message !== "string")
    ) {
      throw new ProtocolError("App Freezer returned an invalid action result.");
    }
    lastAction = {
      requestID: value.lastAction.requestID,
      status: value.lastAction.status,
      message: value.lastAction.message,
    };
  }

  return {
    protocolVersion: SUPPORTED_PROTOCOL_VERSION,
    generatedAt: value.generatedAt,
    applications: value.applications.map(parseApplication),
    lastAction,
  };
}

export function actionOutcome(action: LastAction | undefined, requestID: string): "pending" | "success" | "error" {
  if (!action || action.requestID !== requestID) return "pending";
  return action.status === "succeeded" ? "success" : "error";
}

export function actionError(action: LastAction): string {
  return action.message || "App Freezer could not complete the action.";
}
