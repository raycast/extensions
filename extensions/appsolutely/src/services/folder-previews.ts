import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { LauncherApplication } from "../models/application.ts";
import type { LauncherState } from "../models/folder.ts";
import { descendants } from "../utils/hierarchy.ts";
import { byOrderThenName } from "../utils/sorting.ts";
import { assignmentFor } from "./application-model.ts";
import { loadApplicationIcons } from "./application-icons.ts";

const SIZE = 512;
const PREVIEW_LIMIT = 9;
const PREVIEW_VERSION = 1;

export interface FolderPreviewEntry {
  appPath: string;
  iconPath?: string;
}

/** Direct apps come first; descendant apps also make nested-only folders recognizable. */
export function folderPreviewEntries(
  folderId: string,
  applications: LauncherApplication[],
  state: LauncherState,
): FolderPreviewEntry[] {
  if (!state.folders.some((folder) => folder.id === folderId)) return [];
  const contained = descendants(state.folders, folderId);
  return applications
    .map((app) => ({ app, assignment: assignmentFor(app, state) }))
    .filter(({ assignment }) => assignment?.folderId != null && contained.has(assignment.folderId))
    .sort(
      (a, b) =>
        Number(b.assignment!.folderId === folderId) - Number(a.assignment!.folderId === folderId) ||
        byOrderThenName(
          { name: a.app.name, order: a.assignment!.order },
          { name: b.app.name, order: b.assignment!.order },
        ) ||
        a.app.path.localeCompare(b.app.path),
    )
    .slice(0, PREVIEW_LIMIT)
    .map(({ app }) => ({ appPath: app.path }));
}

export function folderPreviewKey(entries: FolderPreviewEntry[]): string {
  return createHash("sha256")
    .update(JSON.stringify([PREVIEW_VERSION, entries.slice(0, PREVIEW_LIMIT)]))
    .digest("hex");
}

function background(): PNG {
  const result = new PNG({ width: SIZE, height: SIZE });
  for (let y = 24; y < 488; y++) {
    for (let x = 24; x < 488; x++) {
      const dx = Math.max(128 - x, 0, x - 384);
      const dy = Math.max(128 - y, 0, y - 384);
      const coverage = Math.max(0, Math.min(1, 104.5 - Math.hypot(dx, dy)));
      const offset = (y * SIZE + x) * 4;
      result.data[offset] = 125 - Math.round(y / 48);
      result.data[offset + 1] = 144 - Math.round(y / 48);
      result.data[offset + 2] = 164 - Math.round(y / 48);
      result.data[offset + 3] = Math.round(246 * coverage);
    }
  }
  return result;
}

function placeholder(): PNG {
  const image = new PNG({ width: 64, height: 64 });
  for (let y = 4; y < 60; y++) {
    for (let x = 4; x < 60; x++) {
      const dx = Math.max(16 - x, 0, x - 48);
      const dy = Math.max(16 - y, 0, y - 48);
      if (Math.hypot(dx, dy) > 12) continue;
      const offset = (y * 64 + x) * 4;
      const isGrid = ((x >= 17 && x < 29) || (x >= 35 && x < 47)) && ((y >= 17 && y < 29) || (y >= 35 && y < 47));
      image.data.set(isGrid ? [92, 137, 177, 255] : [236, 241, 246, 255], offset);
    }
  }
  return image;
}

/** Area filtering in premultiplied alpha keeps small icons sharp without dark fringes. */
function drawIcon(target: PNG, image: PNG, left: number, top: number): void {
  const scale = 112 / Math.max(image.width, image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  left += Math.floor((112 - width) / 2);
  top += Math.floor((112 - height) / 2);
  for (let y = 0; y < height; y++) {
    const y0 = (y * image.height) / height;
    const y1 = ((y + 1) * image.height) / height;
    for (let x = 0; x < width; x++) {
      const x0 = (x * image.width) / width;
      const x1 = ((x + 1) * image.width) / width;
      let alpha = 0;
      let red = 0;
      let green = 0;
      let blue = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        const weightY = Math.min(sy + 1, y1) - Math.max(sy, y0);
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const weight = weightY * (Math.min(sx + 1, x1) - Math.max(sx, x0));
          const source = (sy * image.width + sx) * 4;
          const a = (image.data[source + 3] / 255) * weight;
          alpha += a;
          red += image.data[source] * a;
          green += image.data[source + 1] * a;
          blue += image.data[source + 2] * a;
        }
      }
      const area = (x1 - x0) * (y1 - y0);
      const sourceAlpha = alpha / area;
      const destination = ((top + y) * SIZE + left + x) * 4;
      const remainingAlpha = (target.data[destination + 3] / 255) * (1 - sourceAlpha);
      const outputAlpha = sourceAlpha + remainingAlpha;
      if (!outputAlpha) continue;
      target.data[destination] = Math.round((red / area + target.data[destination] * remainingAlpha) / outputAlpha);
      target.data[destination + 1] = Math.round(
        (green / area + target.data[destination + 1] * remainingAlpha) / outputAlpha,
      );
      target.data[destination + 2] = Math.round(
        (blue / area + target.data[destination + 2] * remainingAlpha) / outputAlpha,
      );
      target.data[destination + 3] = Math.round(outputAlpha * 255);
    }
  }
}

/** A 3×3 Launchpad-style composite. Undefined slots use a generic app tile. */
export function renderFolderPreview(images: (Buffer | undefined)[]): Buffer {
  const result = background();
  for (const [index, buffer] of images.slice(0, PREVIEW_LIMIT).entries()) {
    let image: PNG;
    try {
      image = buffer ? PNG.sync.read(buffer) : placeholder();
    } catch {
      image = placeholder();
    }
    drawIcon(result, image, 64 + (index % 3) * 136, 64 + Math.floor(index / 3) * 136);
  }
  return PNG.sync.write(result);
}

const pending = new Map<string, Promise<string | undefined>>();
// Serialize rendering to bound memory when many folders are visible at once.
let renderQueue: Promise<unknown> = Promise.resolve();

export function folderPreview(
  entries: FolderPreviewEntry[],
  directory: string,
  iconDirectory?: string,
  signal?: AbortSignal,
  resolveIcons?: (paths: string[], signal?: AbortSignal) => Promise<ReadonlyMap<string, string | undefined>>,
): Promise<string | undefined> {
  if (!entries.length || signal?.aborted) return Promise.resolve(undefined);
  const visible = entries.slice(0, PREVIEW_LIMIT);
  const requestKey = JSON.stringify([directory, iconDirectory, visible]);
  const existing = signal ? undefined : pending.get(requestKey);
  if (existing) return existing;
  const prepare = async () => {
    if (!iconDirectory || signal?.aborted) return visible;
    if (resolveIcons) {
      const icons = await resolveIcons(
        visible.map((entry) => entry.appPath),
        signal,
      );
      return visible.map((entry) => ({ ...entry, iconPath: icons.get(entry.appPath) }));
    }
    const icons = new Map<string, string>();
    await loadApplicationIcons(
      visible.map((entry) => entry.appPath),
      iconDirectory,
      (path, image) => {
        if (image) icons.set(path, image);
      },
      signal,
    );
    return visible.map((entry) => ({ ...entry, iconPath: icons.get(entry.appPath) }));
  };
  const task = Promise.resolve()
    .then(prepare)
    .then((resolved) => {
      const rendering = renderQueue.then(async () => {
        let temporary: string | undefined;
        try {
          if (signal?.aborted) return undefined;
          const key = join(directory, `${folderPreviewKey(resolved)}.png`);
          try {
            const cached = PNG.sync.read(await readFile(key));
            if (cached.width === SIZE && cached.height === SIZE) return key;
          } catch {
            // An absent or corrupt preview is regenerated from its app icons.
          }
          const images = await Promise.all(
            resolved.map(async (entry) =>
              entry.iconPath ? readFile(entry.iconPath).catch(() => undefined) : undefined,
            ),
          );
          if (signal?.aborted) return undefined;
          const image = renderFolderPreview(images);
          await mkdir(directory, { recursive: true });
          temporary = join(directory, `${randomUUID()}.tmp`);
          await writeFile(temporary, image);
          await rename(temporary, key);
          return key;
        } catch {
          // Unavailable storage must leave the folder usable with its native icon.
          return undefined;
        } finally {
          if (temporary) await rm(temporary, { force: true }).catch(() => undefined);
        }
      });
      renderQueue = rendering.catch(() => undefined);
      return rendering;
    })
    .catch(() => undefined);
  if (!signal) pending.set(requestKey, task);
  if (!signal) void task.finally(() => pending.delete(requestKey));
  return task;
}
