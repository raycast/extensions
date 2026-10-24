/** Local, temporary image references for hosts that reject data URLs in Markdown. */
import {
  mkdir,
  mkdtemp,
  readdir,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export async function createPreviewFiles(support: string) {
  // Tinycast's Markdown image loader accepts inline JPEGs but does not resolve
  // local file references. Its extension support directory identifies the host.
  // Raycast rejects inline JPEGs, so only Raycast needs temporary file copies.
  if (support.includes("/com.tinycast.app/"))
    return {
      async write(image: string) {
        return image;
      },
      async close() {},
    };
  const root = join(support, "preview-cache");
  await mkdir(root, { recursive: true, mode: 0o700 });
  // A host may stop its JS context before unmount cleanup completes. Expire
  // abandoned sessions; this directory contains only our generated JPEGs.
  for (const name of await readdir(root)) {
    if (!/^session-[a-zA-Z0-9]+$/.test(name)) continue;
    const path = join(root, name);
    const details = await stat(path).catch(() => undefined);
    if (details && Date.now() - details.mtimeMs > 15 * 60_000)
      await rm(path, { recursive: true, force: true });
  }
  const directory = await mkdtemp(join(root, "session-"));
  const heartbeat = setInterval(() => {
    const now = new Date();
    void utimes(directory, now, now).catch(() => {});
  }, 5 * 60_000);
  let closed = false;
  let sequence = 0;
  let total = 0;
  return {
    async write(image: string) {
      if (closed) throw new Error("Preview was closed");
      const match = /^data:image\/jpeg;base64,([a-zA-Z0-9+/=]+)$/.exec(image);
      if (!match || match[1].length > 8 * 1024 * 1024)
        throw new Error("Invalid preview image");
      const content = Buffer.from(match[1], "base64");
      total += content.length;
      if (total > 24 * 1024 * 1024)
        throw new Error("Preview cache limit exceeded");
      if (content[0] !== 0xff || content[1] !== 0xd8)
        throw new Error("Invalid JPEG preview");
      const path = join(directory, `${sequence++}.jpg`);
      await writeFile(path, content, { mode: 0o600 });
      if (closed) {
        await rm(directory, { recursive: true, force: true });
        throw new Error("Preview was closed");
      }
      return pathToFileURL(path).href;
    },
    async close() {
      closed = true;
      clearInterval(heartbeat);
      await rm(directory, { recursive: true, force: true });
    },
  };
}
