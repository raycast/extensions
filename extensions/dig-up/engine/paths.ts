// Where everything lives. Pure: it builds strings and never touches the disk.

import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface Paths {
  support: string;
  assets: string;
  indexDir: string;
  mainDb: string;
  codeDb: string;
  scratch: string;
  logs: string;
  llamaDir: string;
  modelsDir: string;
  thumbs: string;
  costs: string;
  socket: string;
  pidFile: string;
  configFile: string;
  helperBin: string;
  daemonJs: string;
}

export function makePaths(support: string, assets: string): Paths {
  // `.noindex` keeps Spotlight out of the index; DigUp does the same (DigUp: AppPaths).
  const indexDir = join(support, "index.noindex");
  // macOS caps a Unix socket path at 104 bytes and `support` alone is about 80, so the socket gets a short folder.
  const uid = process.getuid?.() ?? 0;
  const hash = createHash("sha1").update(support).digest("hex").slice(0, 8);
  return {
    support,
    assets,
    indexDir,
    mainDb: join(indexDir, "index.sqlite"),
    codeDb: join(indexDir, "code.sqlite"),
    scratch: join(tmpdir(), `DigUpRaycast-${process.pid}`),
    logs: join(support, "logs"),
    llamaDir: join(support, "llama"),
    modelsDir: join(support, "models"),
    thumbs: join(support, "thumbs"),
    costs: join(indexDir, "costs.json"),
    socket: join("/tmp", `digup-${uid}-${hash}`, "d.sock"),
    pidFile: join(support, "daemon.pid"),
    configFile: join(support, "config.json"),
    helperBin: join(assets, "digup-helper"),
    daemonJs: join(assets, "daemon.js"),
  };
}
