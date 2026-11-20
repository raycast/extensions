import { AppleTVConnection, connect, disconnect } from "@bharper/atv-js";
import { loadPairing, saveDevice } from "./pairing";
import { PairingExpiredError, UnreachableError } from "./errors";

/** Longer than the library's own 5s per-step timeout, so its errors win when it has one. */
const CONNECT_TIMEOUT_MS = 8000;

/**
 * Socket errors, and a pair-verify request that never got an answer, mean the
 * Apple TV did not respond. They say nothing about the pairing, and sending
 * the user to pair again would only trip tvOS's pairing backoff.
 */
const NO_ANSWER = /Auth exchange timeout|ECONNREFUSED|ECONNRESET|EHOSTDOWN|EHOSTUNREACH|ENETUNREACH|ETIMEDOUT/;

/** The library's messages for an Apple TV that answered and rejected our keys. */
const REJECTED =
  /Pairing error|Signature verification failed|Failed to decrypt|identifier mismatch|Invalid credentials/;

/**
 * Open a connection to the paired Apple TV (TCP + pair-verify + Companion
 * session init). Caller owns the connection and must call `disconnect`.
 */
export async function openConnection(): Promise<AppleTVConnection> {
  const { device, credentials } = await loadPairing();

  // If `connect` outruns the timeout we stop awaiting it, but it may still
  // resolve later with a live socket: dispose that orphan instead of leaking it.
  let timedOut = false;
  const pending = connect(device, credentials);
  pending.then((late) => timedOut && disconnect(late)).catch(() => {});

  const conn = await new Promise<AppleTVConnection>((resolve, reject) => {
    const timer = setTimeout(() => {
      timedOut = true;
      reject(new UnreachableError(device.name));
    }, CONNECT_TIMEOUT_MS);
    pending.then(resolve, (error: Error) => {
      if (NO_ANSWER.test(error.message)) reject(new UnreachableError(device.name));
      else if (REJECTED.test(error.message)) reject(new PairingExpiredError());
      else reject(error);
    });
    pending.finally(() => clearTimeout(timer)).catch(() => {});
  });

  // connect() re-discovers the endpoint when the saved one stops answering
  // (the Companion port is dynamic and changes after a restart), so keep the
  // corrected record. The identifier stays: credentials are stored under it.
  // atv-js introduces itself with a null client ID, and tvOS pushes no state
  // events (now playing, power) to such a client (pyatv 8f800724). Repeat the
  // introduction with an ID: the pairing's own client ID, so it stays stable.
  const clientId = conn.credentials.companion.split(":")[3] ?? "";
  try {
    if (!conn.usedCredentialsMatchProvided) {
      await saveDevice({ ...conn.device, identifier: device.identifier });
    }
    await conn.protocol.sendCommand("_systemInfo", {
      _bf: 0,
      _cf: 512,
      _clFl: 128,
      _i: clientId.slice(0, 12),
      _idsID: Buffer.from(clientId, "hex"),
      _pubID: "FF:70:79:61:74:76",
      _sf: 256,
      _sv: "170.18",
      model: "iPhone10,6",
      name: "Raycast",
    });
  } catch (error) {
    // The caller never receives this connection, so nothing else would close it.
    disconnect(conn);
    throw error;
  }
  return conn;
}

/**
 * Run a single action against the Apple TV with a short-lived connection.
 * Used by no-view commands, the menu bar, and AI tools; the remote view keeps
 * one live session instead via `usePersistentConnection`.
 */
export async function withConnection<T>(fn: (conn: AppleTVConnection) => Promise<T>): Promise<T> {
  const conn = await openConnection();
  try {
    return await fn(conn);
  } finally {
    disconnect(conn);
  }
}
