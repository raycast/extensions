import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, unlink, open } from "node:fs/promises";
import path from "node:path";
import { parseSettingsTransfer, serializeSettingsTransfer, type PortableSettings } from "./settings-transfer";

export type SharedSettingsFile = { settings: PortableSettings; digest: string };

function checkedPath(filePath: string): string {
  if (!path.isAbsolute(filePath) || !filePath.toLowerCase().endsWith(".json"))
    throw new Error("Enter an absolute JSON file path in Raycast preferences");
  return path.normalize(filePath);
}

export async function readSharedSettings(filePath: string): Promise<SharedSettingsFile> {
  const target = checkedPath(filePath);
  const stat = await lstat(target);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 16_384)
    throw new Error("Shared settings must be a valid regular JSON file");
  const raw = await readFile(target, "utf8");
  return { settings: parseSettingsTransfer(raw), digest: createHash("sha256").update(raw).digest("hex") };
}

async function writeTemp(filePath: string, json: string): Promise<string> {
  const temp = `${filePath}.${randomUUID()}.tmp`;
  const handle = await open(temp, "wx", 0o600);
  try {
    await handle.writeFile(json, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close();
    await unlink(temp).catch(() => undefined);
    throw error;
  }
  await handle.close();
  return temp;
}

export async function createSharedSettings(filePath: string, settings: PortableSettings): Promise<SharedSettingsFile> {
  const target = checkedPath(filePath);
  await mkdir(path.dirname(target), { recursive: true });
  const json = serializeSettingsTransfer(settings);
  const handle = await open(target, "wx", 0o600);
  const identity = await handle.stat();
  try {
    await handle.writeFile(json, "utf8");
    await handle.sync();
    const created = await readSharedSettings(target);
    if (created.digest !== createHash("sha256").update(json).digest("hex"))
      throw new Error("File changed during creation; it was not accepted as the baseline");
    await handle.close();
    return created;
  } catch (error) {
    await handle.close().catch(() => undefined);
    try {
      const current = await lstat(target);
      if (current.dev === identity.dev && current.ino === identity.ino) await unlink(target);
    } catch {
      /* keep replacement or missing path */
    }
    throw error;
  }
}

export async function replaceSharedSettings(
  filePath: string,
  expectedDigest: string,
  settings: PortableSettings,
): Promise<SharedSettingsFile> {
  const target = checkedPath(filePath);
  const lock = `${target}.lock`;
  const lockHandle = await open(lock, "wx", 0o600);
  let lockIdentity: Awaited<ReturnType<typeof lockHandle.stat>> | undefined;
  try {
    lockIdentity = await lockHandle.stat();
    const current = await readSharedSettings(target);
    if (current.digest !== expectedDigest)
      throw new Error("Shared file changed elsewhere; overwrite blocked. Reload it first");
    const json = serializeSettingsTransfer(settings);
    const temp = await writeTemp(target, json);
    try {
      const beforeReplace = await readSharedSettings(target);
      if (beforeReplace.digest !== expectedDigest)
        throw new Error("Shared file changed during writing; overwrite blocked");
      await rename(temp, target);
    } finally {
      await unlink(temp).catch(() => undefined);
    }
    return await readSharedSettings(target);
  } finally {
    try {
      await lockHandle.close();
    } finally {
      try {
        const current = await lstat(lock);
        if (lockIdentity && current.dev === lockIdentity.dev && current.ino === lockIdentity.ino) await unlink(lock);
      } catch {
        /* never remove a replaced or foreign lock */
      }
    }
  }
}
