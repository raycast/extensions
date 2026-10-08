import { environment } from "@raycast/api";
import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getImageBytes } from "../api/client";
import type { RichValue } from "../api/types";

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** Images one description may pull down — enough for any real task, a ceiling for a crafted one. */
const MAX_IMAGES = 20;

/** Downloads in flight at once. */
const BATCH = 4;

interface ImageRef {
  fileId: string;
  alt: string;
}

/**
 * Every image node in a description, in the order they appear.
 *
 * `.` and `..` are dropped here: encoded or not, a URL parser resolves them as
 * path steps, so `files/..` would reach another API route.
 */
export function imageRefs(value: RichValue | undefined): ImageRef[] {
  const found: ImageRef[] = [];
  const walk = (node: { type?: string; attrs?: Record<string, unknown>; content?: unknown[] }) => {
    const fileId = node.attrs?.fileId;
    if (node.type === "image" && typeof fileId === "string" && fileId !== "" && fileId !== "." && fileId !== "..") {
      found.push({ fileId, alt: typeof node.attrs?.alt === "string" ? node.attrs.alt : "" });
    }
    (node.content as typeof found | undefined)?.forEach?.((child) => walk(child as never));
  };
  if (value && typeof value !== "string") walk(value as never);
  return found;
}

/**
 * Pull a description's images onto disk and hand back `fileId → local path`.
 *
 * Raycast's markdown fetches a remote URL without our credentials, and every
 * attachment route here is authenticated — so the bytes have to come down
 * through the API client and be handed over as files. They are cached under the
 * command's support directory and downloaded once per file. The result is a
 * plain object, not a Map: it travels through Raycast's JSON cache.
 */
export async function localImages(workspaceId: string, refs: ImageRef[]): Promise<Record<string, string>> {
  const dir = join(environment.supportPath, "images");
  await mkdir(dir, { recursive: true });

  const fileIds = [...new Set(refs.map((ref) => ref.fileId))].slice(0, MAX_IMAGES);
  const batches = Array.from({ length: Math.ceil(fileIds.length / BATCH) }, (_, i) =>
    fileIds.slice(i * BATCH, (i + 1) * BATCH),
  );
  const entries = await batches.reduce<Promise<Array<readonly [string, string] | null>>>(
    async (done, batch) => [
      ...(await done),
      ...(await Promise.all(batch.map((id) => cachedImage(dir, workspaceId, id)))),
    ],
    Promise.resolve([]),
  );

  return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null));
}

async function cachedImage(
  dir: string,
  workspaceId: string,
  fileId: string,
): Promise<readonly [string, string] | null> {
  try {
    // The file id comes from the task description — remote data — so it never
    // becomes a path itself: `../outside.png` would read and write outside the
    // cache. A digest of workspace and id is a safe, stable cache key; the
    // extension still comes from the MIME type the download reports.
    const base = createHash("sha256")
      .update(JSON.stringify([workspaceId, fileId]))
      .digest("hex");
    const cached = Object.values(EXTENSIONS)
      .map((ext) => join(dir, `${base}.${ext}`))
      .find((candidate) => existsSync(candidate));
    if (cached) return [fileId, cached] as const;

    const image = await getImageBytes(workspaceId, fileId);
    const ext = image && EXTENSIONS[image.mime];
    if (!image || !ext) return null;

    // Written aside and renamed into place: a command closed mid-write would
    // otherwise leave a truncated file that the lookup above serves forever.
    const path = join(dir, `${base}.${ext}`);
    const partial = `${path}.${process.pid}.part`;
    await writeFile(partial, image.data);
    await rename(partial, path);
    return [fileId, path] as const;
  } catch (cause) {
    // A single unreachable attachment must not blank the whole description —
    // but it should not vanish without a trace either: this lands in the
    // `ray develop` console, which is where an image that refuses to render
    // gets diagnosed.
    console.error(`Hule: could not fetch image ${fileId}:`, cause);
    return null;
  }
}
