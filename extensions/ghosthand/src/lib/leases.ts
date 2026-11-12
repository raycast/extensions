import { GhosthandClient } from "./ghosthand-client";
import { errorMessage, GhosthandError } from "./errors";
import type { Lease, Phone } from "./types";

const activeDevices = new Set<string>();

export async function withLease<T>(
  client: GhosthandClient,
  phone: Phone,
  reason: string,
  signal: AbortSignal,
  operation: (lease: Lease) => Promise<T>,
): Promise<T> {
  signal.throwIfAborted();
  if (phone.mac) throw new GhosthandError("invalid-request", "Remote iPhones are not enabled in this release.");
  if (!phone.captureId)
    throw new GhosthandError("no-device", "This iPhone does not have a capture device yet. Complete Ghosthand setup.");
  if (activeDevices.has(phone.id))
    throw new GhosthandError("device-leased", "Another Raycast operation is already using this iPhone.");
  activeDevices.add(phone.id);
  let lease: Lease | undefined;
  try {
    let outcome: { ok: true; value: T } | { ok: false; error: unknown };
    try {
      lease = await client.acquire(phone.captureId, reason);
      signal.throwIfAborted();
      outcome = { ok: true, value: await operation(lease) };
    } catch (error) {
      outcome = { ok: false, error };
    }
    try {
      if (lease) await client.release(lease.id);
    } catch (error) {
      throw new GhosthandError(
        "lease-cleanup-failed",
        [
          outcome.ok ? "The operation finished." : errorMessage(outcome.error),
          `Lease release could not be confirmed: ${errorMessage(error)}`,
          "The lease has a 10-minute idle expiry. Check Ghosthand before trying another operation.",
        ].join("\n\n"),
      );
    }
    if (!outcome.ok) throw outcome.error;
    return outcome.value;
  } finally {
    activeDevices.delete(phone.id);
  }
}
