import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { lock } from "proper-lockfile";
import { ConnectionError } from "./config";
import { withEditsClient } from "./connection";

// Edits has one active project, shared by all command and AI tool processes.
// Do not key this by endpoint: localhost aliases and token changes share that editor.
const projectLock = join(tmpdir(), `raycast-edits-project-${userInfo().uid}`);

export async function withProjectClient<T>(
  config: Parameters<typeof withEditsClient>[0],
  operation: Parameters<typeof withEditsClient<T>>[1],
  timeoutMs = 30_000,
): Promise<T> {
  const controller = new AbortController();
  let compromised = false;
  let release: () => Promise<void>;
  try {
    release = await lock(projectLock, {
      realpath: false,
      // Longer than the maximum editor session, with a heartbeat for live owners.
      stale: 120_000,
      update: 10_000,
      retries: { retries: 240, factor: 1, minTimeout: 250, maxTimeout: 250 },
      onCompromised: () => {
        compromised = true;
        controller.abort();
      },
    });
  } catch {
    throw new ConnectionError("Edits is busy", "Wait for the current project operation to finish, then try again.");
  }
  try {
    return await withEditsClient(config, operation, controller.signal, timeoutMs);
  } finally {
    if (!compromised) await release();
  }
}
