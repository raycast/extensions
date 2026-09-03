import { environment } from "@raycast/api";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getFileBytes } from "../api/client";
import type { RichValue } from "../api/types";

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

interface ImageRef {
  fileId: string;
  alt: string;
}

/** Every image node in a description, in the order they appear. */
export function imageRefs(value: RichValue | undefined): ImageRef[] {
  const found: ImageRef[] = [];
  const walk = (node: { type?: string; attrs?: Record<string, unknown>; content?: unknown[] }) => {
    if (node.type === "image" && typeof node.attrs?.fileId === "string") {
      found.push({ fileId: node.attrs.fileId, alt: typeof node.attrs.alt === "string" ? node.attrs.alt : "" });
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

  const entries = await Promise.all(
    refs.map(async ({ fileId }) => {
      try {
        // A stored file id already carries the original name, extension and all
        // (`<uuid>-image.png`), so appending another one produced `…png.png`.
        const base = fileId.replace(/\.(png|jpe?g|gif|webp)$/i, "");
        const cached = ["png", "jpg", "gif", "webp"]
          .map((ext) => join(dir, `${base}.${ext}`))
          .find((candidate) => existsSync(candidate));
        if (cached) return [fileId, cached] as const;

        const { data, mime } = await getFileBytes(workspaceId, fileId);
        const ext = EXTENSIONS[mime.split(";")[0].trim()];
        if (!ext) return null;

        const path = join(dir, `${base}.${ext}`);
        await writeFile(path, data);
        return [fileId, path] as const;
      } catch (cause) {
        // A single unreachable attachment must not blank the whole description —
        // but it should not vanish without a trace either: this lands in the
        // `ray develop` console, which is where an image that refuses to render
        // gets diagnosed.
        console.error(`Hule: could not fetch image ${fileId}:`, cause);
        return null;
      }
    }),
  );

  return Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null));
}
