import { OrcaCliError } from "./orca-cli";

export type OrcaStatus = { running: boolean };

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

/** Orca est joignable quand l'app tourne ET que son runtime répond. */
export function parseStatus(result: unknown): OrcaStatus {
  const root = asRecord(result);
  const appRunning = asRecord(root.app).running === true;
  const runtimeReachable = asRecord(root.runtime).reachable === true;
  return { running: appRunning && runtimeReachable };
}

/**
 * Orca est à l'arrêt quand `orca status` répond « pas lancé », ou quand il lève `runtime_unavailable`
 * (Orca planté : « Orca is not running. Run 'orca open' first. »). Toute autre erreur reste une erreur.
 */
export function isOrcaDown(status: OrcaStatus | undefined, error: unknown): boolean {
  if (status !== undefined && !status.running) {
    return true;
  }
  return error instanceof OrcaCliError && error.code === "runtime_unavailable";
}
