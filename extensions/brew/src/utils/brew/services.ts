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

/**
 * Look up a service by name from a freshly fetched list.
 * Used to confirm the outcome of an action.
 */
export function findService(services: Service[], name: string): Service | undefined {
  return services.find((service) => service.name === name);
}
