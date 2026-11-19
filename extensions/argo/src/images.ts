import { environment, LocalStorage } from "@raycast/api";
import { constants } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { mkdir, open, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { basename, join } from "node:path";
import {
  imageAttachmentSchema,
  imageMime,
  MAX_IMAGE_BYTES,
  type ImageAttachment,
  type ImageUpload,
} from "./protocol.js";
import { parseSessionTarget, type SessionTarget } from "./session-target.js";

export type LocalImage = ImageAttachment & { id: string; path: string };
type ImageRecord = {
  image: ImageAttachment;
  target?: SessionTarget;
  createdAt: number;
  retainedAt?: number;
  releasedAt?: number;
};
let cacheWrites: Promise<unknown> = Promise.resolve();
function mutateCache<T>(action: () => Promise<T>): Promise<T> {
  const write = cacheWrites.then(async () => {
    await mkdir(cacheDirectory(), { recursive: true, mode: 0o700 });
    const path = join(cacheDirectory(), ".cache-lock.sqlite");
    const file = await open(
      path,
      constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW | constants.O_NONBLOCK,
      0o600,
    );
    try {
      const stat = await file.stat();
      if (!stat.isFile() || (stat.mode & 0o077) !== 0 || stat.uid !== process.getuid?.())
        throw new Error("The image cache lock must be private and owned by you.");
    } finally {
      await file.close();
    }
    // A SQLite transaction coordinates command isolates/processes and releases its lock on process death.
    // No image data or references are stored in this database, and lock contention never blocks the event loop.
    const lock = new DatabaseSync(path);
    try {
      try {
        lock.exec("PRAGMA busy_timeout=0; BEGIN IMMEDIATE");
      } catch (cause) {
        if ([5, 6].includes((cause as { errcode?: number }).errcode ?? 0))
          throw new Error("The image cache is busy in another command. Try again; your saved draft is kept.");
        throw cause;
      }
      return await action();
    } finally {
      lock.close();
    }
  });
  cacheWrites = write.catch(() => undefined);
  return write;
}
const cacheDirectory = () => join(environment.supportPath, "images-v1");
const imageId = (id: string) => {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid image reference.");
  return id;
};
const suffix = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function bytesAt(path: string, privateFile = false): Promise<Buffer> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > MAX_IMAGE_BYTES)
      throw new Error("Choose a PNG, JPEG or WebP image up to 4 MiB.");
    if (privateFile && ((stat.mode & 0o077) !== 0 || stat.uid !== process.getuid?.()))
      throw new Error("The cached image must be private and owned by you.");
    const buffer = Buffer.alloc(MAX_IMAGE_BYTES + 1);
    let size = 0;
    while (size < buffer.length) {
      const { bytesRead } = await file.read(buffer, size, buffer.length - size, null);
      if (!bytesRead) break;
      size += bytesRead;
    }
    if (size !== stat.size || size > MAX_IMAGE_BYTES)
      throw new Error("The image changed while being read. Choose it again.");
    return buffer.subarray(0, size);
  } finally {
    await file.close();
  }
}

async function recordAt(id: string): Promise<ImageRecord> {
  const path = join(cacheDirectory(), `${imageId(id)}.json`);
  const raw = await bytesAt(path, true);
  const saved = JSON.parse(raw.toString("utf8")) as ImageRecord;
  const image = imageAttachmentSchema.parse(saved.image);
  const target = saved.target ? parseSessionTarget(JSON.stringify(saved.target)) : undefined;
  for (const timestamp of [saved.createdAt, saved.retainedAt, saved.releasedAt])
    if (timestamp !== undefined && (!Number.isFinite(timestamp) || timestamp < 0))
      throw new Error("Invalid image cache record.");
  return {
    image,
    ...(target ? { target } : {}),
    createdAt: saved.createdAt ?? (await stat(path)).mtimeMs,
    ...(saved.retainedAt !== undefined ? { retainedAt: saved.retainedAt } : {}),
    ...(saved.releasedAt !== undefined ? { releasedAt: saved.releasedAt } : {}),
  };
}

export async function getCapture(id: string): Promise<{ image: LocalImage; target?: SessionTarget }> {
  const saved = await recordAt(id);
  return {
    image: { ...saved.image, id, path: join(cacheDirectory(), `${id}.${suffix[saved.image.mimeType]}`) },
    target: saved.target,
  };
}
export async function getImage(id: string): Promise<LocalImage> {
  return (await getCapture(id)).image;
}
export async function readImage(id: string): Promise<ImageUpload> {
  const image = await getImage(id);
  const bytes = await bytesAt(image.path, true);
  if (bytes.length !== image.size || digest(bytes) !== image.sha256 || imageMime(bytes) !== image.mimeType)
    throw new Error("The saved image changed. Nothing was sent; choose the image again.");
  const { name, mimeType, size, sha256 } = image;
  return { name, mimeType, size, sha256, data: bytes.toString("base64") };
}

async function cacheSpace(size: number) {
  const directory = cacheDirectory();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  let total = 0;
  for (const file of await readdir(directory)) {
    if (!/^[a-f0-9-]{36}\.json$/.test(file)) continue;
    const id = file.slice(0, -5);
    let saved = await recordAt(id);
    const expired = (record: ImageRecord) =>
      Date.now() - (record.releasedAt ?? record.retainedAt ?? record.createdAt) > 7 * 86400_000;
    let remove = false;
    if (expired(saved)) {
      // Include drafts, unknown attempts and capture recovery, even partially unreadable JSON journals.
      const referenced = Object.values(await LocalStorage.allItems()).some(
        (value) => typeof value === "string" && value.includes(id),
      );
      saved = await recordAt(id);
      remove = !referenced && expired(saved);
    }
    if (remove) {
      await unlink(join(directory, `${id}.${suffix[saved.image.mimeType]}`)).catch((cause: NodeJS.ErrnoException) => {
        if (cause.code !== "ENOENT") throw cause;
      });
      await unlink(join(directory, file));
    } else total += saved.image.size;
  }
  // ponytail: bounded private cache, refuse new images rather than discard pending or uncertain drafts.
  if (total + size > 100 * 1024 * 1024)
    throw new Error("Image drafts use 100 MiB. Remove saved attachments before adding more.");
}

export async function importImage(path: string, target?: SessionTarget): Promise<LocalImage> {
  return mutateCache(async () => {
    const bytes = await bytesAt(path);
    const mimeType = imageMime(bytes);
    const id = randomUUID();
    const name =
      basename(path)
        // eslint-disable-next-line no-control-regex -- attachment names intentionally remove control bytes
        .replace(/[\x00-\x1f\x7f-\x9f\\/]/g, "_")
        .slice(0, 180) || `Screenshot.${suffix[mimeType]}`;
    const image = imageAttachmentSchema.parse({ name, mimeType, size: bytes.length, sha256: digest(bytes) });
    await cacheSpace(bytes.length);
    const destination = join(cacheDirectory(), `${id}.${suffix[mimeType]}`);
    await writeFile(destination, bytes, { flag: "wx", mode: 0o600 });
    try {
      await writeFile(
        join(cacheDirectory(), `${id}.json`),
        JSON.stringify({ image, createdAt: Date.now(), ...(target ? { target } : {}) }),
        {
          flag: "wx",
          mode: 0o600,
        },
      );
    } catch (cause) {
      await unlink(destination);
      throw cause;
    }
    return { ...image, id, path: destination };
  });
}

async function writeRecord(id: string, saved: ImageRecord): Promise<void> {
  const temporary = join(cacheDirectory(), `${randomUUID()}.record.json`);
  try {
    await writeFile(temporary, JSON.stringify(saved), { flag: "wx", mode: 0o600 });
    await rename(temporary, join(cacheDirectory(), `${imageId(id)}.json`));
  } finally {
    await unlink(temporary).catch((cause: NodeJS.ErrnoException) => {
      if (cause.code !== "ENOENT") throw cause;
    });
  }
}

// Retain before publishing a draft reference; a failed save still has a bounded recovery window.
export async function retainImage(id: string): Promise<void> {
  return mutateCache(async () => {
    const saved = await recordAt(id);
    await readImage(id);
    delete saved.releasedAt;
    await writeRecord(id, { ...saved, retainedAt: Date.now() });
  });
}

export async function releaseImage(id: string): Promise<void> {
  return mutateCache(async () => {
    const saved = await recordAt(id);
    await writeRecord(id, { ...saved, releasedAt: Date.now() });
  });
}

export async function captureImage(
  run: (path: string) => Promise<void>,
  target?: SessionTarget,
): Promise<LocalImage | undefined> {
  await mkdir(cacheDirectory(), { recursive: true, mode: 0o700 });
  const path = join(cacheDirectory(), `${randomUUID()}.capture.png`);
  try {
    await run(path);
    try {
      return await importImage(path, target);
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === "ENOENT") return undefined; // Esc can exit successfully without a file.
      throw cause;
    }
  } finally {
    await unlink(path).catch((cause: NodeJS.ErrnoException) => {
      if (cause.code !== "ENOENT") throw cause;
    });
  }
}
