import { constants } from "node:fs";
import { open, lstat, link, unlink } from "node:fs/promises";
import { dirname, isAbsolute, join, parse } from "node:path";
import { randomUUID } from "node:crypto";
import { IntegrationError, ioError } from "./errors";

export const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 32 * 1024;
export const MAX_METADATA_BYTES = 32 * 1024;

export class PublicationError extends IntegrationError {
  constructor(
    error: IntegrationError,
    readonly mayBePublished: boolean,
  ) {
    super(error.code);
  }
}

async function checkDirectory(
  path: string,
  privateDirectory: boolean,
): Promise<void> {
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new IntegrationError("unreadable");
  if (
    privateDirectory &&
    (stat.uid !== process.getuid?.() || (stat.mode & 0o077) !== 0)
  )
    throw new IntegrationError("permissionDenied");
}

export async function checkRoot(root: string): Promise<void> {
  if (!isAbsolute(root)) throw new IntegrationError("unreadable");
  const ancestors: string[] = [];
  for (let path = root; path !== parse(path).root; path = dirname(path))
    ancestors.push(path);
  for (const path of ancestors.reverse())
    await checkDirectory(path, path === root);
}

export async function readJSON(
  root: string,
  relativeName: string,
  maximum: number,
): Promise<unknown> {
  try {
    await checkRoot(root);
    if (
      !/^(descriptor\.json|state\.json|receipts\/[0-9a-f-]{36}\.json)$/.test(
        relativeName,
      )
    )
      throw new IntegrationError("unreadable");
    if (relativeName.startsWith("receipts/"))
      await checkDirectory(join(root, "receipts"), true);
    const file = await open(
      join(root, relativeName),
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    try {
      const stat = await file.stat();
      if (
        !stat.isFile() ||
        stat.nlink !== 1 ||
        stat.uid !== process.getuid?.() ||
        (stat.mode & 0o077) !== 0 ||
        stat.size > maximum
      )
        throw new IntegrationError("unreadable");
      const buffer = Buffer.alloc(maximum + 1);
      let count = 0;
      while (count < buffer.length) {
        const result = await file.read(
          buffer,
          count,
          buffer.length - count,
          count,
        );
        if (!result.bytesRead) break;
        count += result.bytesRead;
      }
      const after = await file.stat();
      if (
        count > maximum ||
        count !== stat.size ||
        after.size !== stat.size ||
        after.mtimeMs !== stat.mtimeMs ||
        after.ctimeMs !== stat.ctimeMs ||
        after.nlink !== 1
      )
        throw new IntegrationError("unreadable");
      try {
        return JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(
            buffer.subarray(0, count),
          ),
        ) as unknown;
      } catch {
        throw new IntegrationError("malformed");
      }
    } finally {
      await file.close();
    }
  } catch (error) {
    throw ioError(error);
  }
}

export async function publishRequest(
  root: string,
  requestID: string,
  bytes: string,
  validateGeneration: () => Promise<void> = async () => {},
): Promise<void> {
  let temporary: string | undefined;
  let published = false;
  let failure: PublicationError | undefined;
  let identity: { dev: number; ino: number; size: number } | undefined;
  const destination = join(root, "requests", `${requestID}.json`);
  try {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        requestID,
      ) ||
      Buffer.byteLength(bytes) > MAX_REQUEST_BYTES
    )
      throw new IntegrationError("malformed");
    await checkRoot(root);
    const requests = join(root, "requests");
    await checkDirectory(requests, true);
    await validateGeneration();
    temporary = join(requests, `.${requestID}.${randomUUID()}.tmp`);
    const handle = await open(
      temporary,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await handle.writeFile(bytes, "utf8");
      await handle.sync();
      identity = await handle.stat();
    } finally {
      await handle.close();
    }
    await validateGeneration();
    // link publishes complete bytes without replacing a request with the same ID.
    await link(temporary, destination);
    published = true;
    await unlink(temporary);
    temporary = undefined;
    const directory = await open(
      requests,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    );
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
    try {
      await validateGeneration();
    } catch (error) {
      // The app renames into processing before any admission side effect.
      // Only our still-unclaimed inode may be removed after opt-out/rotation.
      const current = await lstat(destination).catch(
        (value: NodeJS.ErrnoException) => {
          if (value.code === "ENOENT") return undefined;
          throw value;
        },
      );
      if (
        identity &&
        current?.isFile() &&
        current.nlink === 1 &&
        current.uid === process.getuid?.() &&
        current.dev === identity.dev &&
        current.ino === identity.ino &&
        current.size === identity.size
      ) {
        try {
          await unlink(destination);
          published = false;
        } catch (value) {
          if ((value as NodeJS.ErrnoException).code !== "ENOENT") throw value;
        }
      }
      throw error;
    }
  } catch (error) {
    const safe = ioError(error);
    failure = new PublicationError(
      safe,
      published || safe.code === "requestConflict",
    );
  }
  if (temporary) {
    try {
      await unlink(temporary);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT")
        failure = new PublicationError(
          ioError(error),
          published || (failure?.mayBePublished ?? false),
        );
    }
  }
  if (failure) throw failure;
}
