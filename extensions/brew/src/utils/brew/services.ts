/**
 * Homebrew services utilities.
 *
 * Provides functions for listing and controlling brew services
 * (start/stop/restart), backed by `brew services`.
 */

import { ParseError } from "../errors";
import { actionsLogger, fetchLogger } from "../logger";
import { execBrew } from "./commands";

/**
 * A brew service status as reported by `brew services list`.
 *
 * Known values include "started", "stopped", "none", "error", "scheduled",
 * "other" and "unknown", but brew may report others so this stays a string.
 */
export type ServiceStatus =
  | "started"
  | "stopped"
  | "none"
  | "error"
  | "scheduled"
  | "other"
  | "unknown"
  | (string & {});

/**
 * A brew service, as returned by `brew services list --json`.
 */
export interface Service {
  name: string;
  status: ServiceStatus;
  /** User the service runs as, or null when not running. */
  user: string | null;
  /** Path to the service's plist file. */
  file: string;
  /** Exit code of the last run, or null when unavailable. */
  exit_code: number | null;
}

/** Sentinel used by brew to target every service. */
export const ALL_SERVICES = "--all";

/**
 * Fetch the list of brew services.
 *
 * Uses the JSON output for robust parsing.
 */
export async function brewFetchServices(cancel?: AbortSignal): Promise<Service[]> {
  fetchLogger.log("Fetching brew services");
  const result = await execBrew("services list --json", cancel ? { signal: cancel } : undefined);

  const stdout = result.stdout.trim();
  if (stdout.length === 0) {
    return [];
  }

  try {
    const services = JSON.parse(stdout) as Service[];
    fetchLogger.log("Fetched brew services", { count: services.length });
    return services;
  } catch (err) {
    fetchLogger.error("Failed to parse brew services output", { error: `${err}` });
    throw new ParseError("Failed to parse brew services output", { cause: err as Error });
  }
}

/**
 * Start a brew service. Pass `ALL_SERVICES` to start every service.
 */
export async function brewStartService(name: string, cancel?: AbortSignal): Promise<void> {
  actionsLogger.log("Starting service", { name });
  await execBrew(`services start ${name}`, cancel ? { signal: cancel } : undefined);
  actionsLogger.log("Started service", { name });
}

/**
 * Stop a brew service. Pass `ALL_SERVICES` to stop every service.
 */
export async function brewStopService(name: string, cancel?: AbortSignal): Promise<void> {
  actionsLogger.log("Stopping service", { name });
  await execBrew(`services stop ${name}`, cancel ? { signal: cancel } : undefined);
  actionsLogger.log("Stopped service", { name });
}

/**
 * Restart a brew service. Pass `ALL_SERVICES` to restart every service.
 */
export async function brewRestartService(name: string, cancel?: AbortSignal): Promise<void> {
  actionsLogger.log("Restarting service", { name });
  await execBrew(`services restart ${name}`, cancel ? { signal: cancel } : undefined);
  actionsLogger.log("Restarted service", { name });
}

/**
 * Whether a service is considered active (started, running or scheduled).
 */
export function brewServiceIsRunning(service: Service): boolean {
  return service.status === "started" || service.status === "scheduled";
}

/** The three service operations exposed to the UI. */
export type ServiceAction = "start" | "stop" | "restart";

/** Display copy for each service action, in the tenses used across the UI. */
export const SERVICE_ACTION_COPY: Record<ServiceAction, { verb: string; gerund: string; past: string }> = {
  start: { verb: "Start", gerund: "Starting", past: "Started" },
  stop: { verb: "Stop", gerund: "Stopping", past: "Stopped" },
  restart: { verb: "Restart", gerund: "Restarting", past: "Restarted" },
};

const SERVICE_ACTION_RUNNERS: Record<ServiceAction, (name: string, cancel?: AbortSignal) => Promise<void>> = {
  start: brewStartService,
  stop: brewStopService,
  restart: brewRestartService,
};

/**
 * Run a service action. Throws if the underlying brew command fails.
 *
 * UI-free so it can be shared by the list view and the menu bar command.
 * Callers refresh their service list afterwards (ideally via an optimistic
 * `mutate`) rather than paying for a second `brew services list` here.
 */
export async function runServiceCommand(action: ServiceAction, name: string): Promise<void> {
  await SERVICE_ACTION_RUNNERS[action](name);
}

/**
 * Produce the service list as it is expected to look immediately after an
 * action, for optimistic UI updates. `restart` and `start` resolve to
 * "started"; `stop` to "stopped". Pass `ALL_SERVICES` to update every service.
 */
export function applyServiceAction(services: Service[], action: ServiceAction, name: string): Service[] {
  const status: ServiceStatus = action === "stop" ? "stopped" : "started";
  return services.map((service) => (name === ALL_SERVICES || service.name === name ? { ...service, status } : service));
}
