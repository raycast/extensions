import { getPreferenceValues } from "@raycast/api";
import { AppleTVConnection, AppleTVDevice, connect, disconnect } from "@bharper/atv-js";
import { loadSelectedDevice, saveSelectedDevice } from "./devices";
import { loadCredentials } from "./credentials";
import { UnreachableError } from "./errors";

function connectTimeoutMs(): number {
  const { connectTimeout } = getPreferenceValues<Preferences>();
  const parsed = Number(connectTimeout);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 8000;
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(onTimeout()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/**
 * Open a connection to the paired Apple TV (TCP + pair-verify + Companion
 * session init). Caller owns the connection and must call `disconnect`.
 */
export async function openConnection(): Promise<AppleTVConnection> {
  const device = await loadSelectedDevice();
  const credentials = await loadCredentials(device.identifier);

  const conn = await withTimeout(
    connect(device, credentials),
    connectTimeoutMs(),
    () => new UnreachableError(device.name),
  );

  // connect() re-discovers the endpoint if the saved address/port went stale
  // (e.g. a new DHCP lease) — persist the corrected record for next time.
  if (!conn.usedCredentialsMatchProvided) {
    await saveSelectedDevice(conn.device satisfies AppleTVDevice);
  }

  return conn;
}

/**
 * Run a single action against the Apple TV with a short-lived connection.
 * Used by no-view commands, the menu bar, and AI tools — the persistent-
 * connection path for the remote view lives in `remote.tsx` itself.
 */
export async function withConnection<T>(fn: (conn: AppleTVConnection) => Promise<T>): Promise<T> {
  const conn = await openConnection();
  try {
    return await fn(conn);
  } finally {
    disconnect(conn);
  }
}
