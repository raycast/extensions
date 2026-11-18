import { homedir } from "node:os";
import { join } from "node:path";

// Keep all mutable state in a private, per-user directory; no DigUp paths.
export function paths(
  base = join(homedir(), "Library/Application Support/LocalSearch"),
) {
  return {
    base,
    socket: join(base, "service.sock"),
    config: join(base, "config.json"),
    models: join(base, "models"),
    index: join(base, "index.noindex"),
    engine: join(base, "bin/local-search-engine"),
    daemon: join(base, "bin/service.cjs"),
    logs: join(base, "logs"),
    scratch: join(base, "scratch"),
  };
}

export type Paths = ReturnType<typeof paths>;
