import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, rename, unlink } from "node:fs/promises";

export type Artifact = { url: string; bytes: number; sha256: string };
const DOWNLOAD_TIMEOUT_MS = 20 * 60 * 1000;

// Hash cached files too: a prior partial download must never count as installed.
async function digest(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

// Stream -> private temporary file -> size/hash verification -> atomic publication.
export async function downloadVerified(
  artifact: Artifact,
  target: string,
  progress: (received: number, total: number) => void,
): Promise<void> {
  if (
    await digest(target)
      .then((hash) => hash === artifact.sha256)
      .catch(() => false)
  ) {
    progress(artifact.bytes, artifact.bytes);
    return;
  }

  const response = await fetch(artifact.url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Download returned HTTP ${response.status}`);
  }

  const partial = `${target}.${randomUUID()}.partial`;
  const handle = await open(partial, "wx", 0o600);
  const hash = createHash("sha256");
  let bytes = 0;
  try {
    for await (const chunk of response.body) {
      bytes += chunk.length;
      if (bytes > artifact.bytes) {
        throw new Error("Download exceeded its expected size");
      }
      hash.update(chunk);
      await handle.writeFile(chunk);
      progress(bytes, artifact.bytes);
    }
    if (bytes !== artifact.bytes || hash.digest("hex") !== artifact.sha256) {
      throw new Error("Download size or checksum mismatch; nothing installed");
    }
    await handle.close();
    await rename(partial, target);
  } finally {
    await handle.close().catch(() => {});
    await unlink(partial).catch(() => {});
  }
}
