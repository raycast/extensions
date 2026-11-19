import type { Connection } from "./types";

const identity = (connection: Connection) =>
  JSON.stringify([connection.owner, connection.integration, connection.name]);

/** One serial probe per first unchecked record or cleared verdict, never a retry loop. */
export function createUncheckedHealthChecks(
  check: (connection: Connection, signal: AbortSignal) => Promise<unknown>,
  reload: () => Promise<unknown>,
) {
  const controller = new AbortController();
  const records = new Map<string, { health: Connection["lastHealth"]; generation: symbol }>();
  let latest = new Map<string, Connection>();
  let pending = Promise.resolve();
  return {
    observe(connections: Connection[]) {
      latest = new Map(connections.map((connection) => [identity(connection), connection]));
      for (const key of records.keys()) {
        if (!latest.has(key)) records.delete(key);
      }
      for (const connection of connections) {
        const key = identity(connection);
        const previous = records.get(key);
        const first = !previous;
        const cleared = Boolean(previous?.health) && !connection.lastHealth;
        const generation = first || cleared ? Symbol() : previous.generation;
        records.set(key, { health: connection.lastHealth, generation });
        if ((!first && !cleared) || (connection.lastHealth && connection.lastHealth.status !== "unknown")) continue;
        pending = pending.then(async () => {
          const current = latest.get(key);
          if (
            controller.signal.aborted ||
            records.get(key)?.generation !== generation ||
            !current ||
            (current.lastHealth && current.lastHealth.status !== "unknown")
          )
            return;
          try {
            await check(current, controller.signal);
            if (!controller.signal.aborted && records.get(key)?.generation === generation) await reload();
          } catch {
            // Preserve recorded state; Check Health is the explicit retry path.
          }
        });
      }
      return pending;
    },
    dispose() {
      controller.abort();
    },
  };
}
