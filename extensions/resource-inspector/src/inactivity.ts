import { environment } from "@raycast/api";
import {
  cp,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { nativeCall } from "./native";
import { binary, databasePath, prepare } from "./runtime";
import { Entity, ProcessRow, Snapshot } from "./model";
import { resourceClass } from "./tracking";

export interface WatchRule {
  id: string;
  kind: "app" | "process";
  name: string;
  executable: string;
  appPath?: string;
  bundleId?: string;
}
export interface IdleInstance {
  target: {
    ruleID: string;
    boot: string;
    target: ProcessRow;
    members: ProcessRow[];
  };
  timestamp: number;
  awake: number;
  quietSeconds: number;
  episode: string;
  notified: boolean;
}
export interface IdleStatus {
  paused: boolean;
  state: {
    enabled: boolean;
    thresholdSeconds: number;
    rules: WatchRule[];
    instances: Record<string, IdleInstance>;
    notices: {
      id: string;
      instanceKey: string;
      name: string;
      kind: string;
      status: string;
    }[];
    outcomes: { id: string; name: string; time: number; message: string }[];
  };
}
export async function inactivity(
  operation: string,
  values: Record<string, unknown> = {},
) {
  await prepare();
  return nativeCall<IdleStatus>(binary, "inactivity", {
    ...values,
    path: databasePath,
    operation,
  });
}
export function canWatch(entity: Entity) {
  return (
    entity.kind !== "container" &&
    !!entity.target &&
    !entity.blockedReason &&
    resourceClass(entity.target) === "user" &&
    (entity.kind === "app" || !/\.app\//.test(entity.target.executable))
  );
}
export async function watch(entity: Entity, snapshot: Snapshot) {
  if (!canWatch(entity))
    throw new Error("Select an eligible application or standalone process");
  return inactivity("watch", {
    kind: entity.kind,
    pid: entity.target!.pid,
    start: entity.target!.start,
    executable: entity.target!.executable,
    boot: snapshot.boot,
  });
}

const appName = "Resource Inspector Notifications.app";
let installing: Promise<string> | undefined;
async function installNotifier() {
  await prepare();
  const source = join(environment.assetsPath, appName),
    destination = join(environment.supportPath, appName);
  const executable = join("Contents", "MacOS", "notifications");
  const digest = createHash("sha256")
    .update(await readFile(join(source, executable)))
    .update(await readFile(join(source, "Contents", "Info.plist")))
    .digest("hex");
  const stamp = join(environment.supportPath, "notifications-version");
  if (
    (await readFile(stamp, "utf8").catch(() => "")) === digest &&
    (await stat(join(destination, executable)).catch(() => null))
  )
    return join(destination, executable);
  const lock = join(environment.supportPath, "notifications-install.lock");
  const previousLock = await stat(lock).catch(() => null);
  if (previousLock && Date.now() - previousLock.mtimeMs > 120000)
    await rm(lock, { recursive: true, force: true });
  try {
    await mkdir(lock, { mode: 0o700 });
  } catch {
    throw new Error("Notification helper installation is busy. Try again.");
  }
  const staging = join(
    environment.supportPath,
    `notifications-${randomUUID()}.app`,
  );
  const backup = join(
    environment.supportPath,
    `notifications-old-${randomUUID()}.app`,
  );
  let backedUp = false;
  try {
    await cp(source, staging, { recursive: true });
    if (await stat(destination).catch(() => null)) {
      await rename(destination, backup);
      backedUp = true;
    }
    try {
      await rename(staging, destination);
    } catch (error) {
      if (backedUp) await rename(backup, destination);
      throw error;
    }
    await writeFile(stamp, digest, { mode: 0o600 });
    await rm(backup, { recursive: true, force: true });
    return join(destination, executable);
  } finally {
    await rm(staging, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}
export async function notifications(
  operation: "status" | "permission" | "deliver" | "reconcile",
) {
  installing ??= installNotifier().catch((error) => {
    installing = undefined;
    throw error;
  });
  return nativeCall<{ authorized?: boolean; status?: string | number }>(
    await installing,
    operation,
    undefined,
    operation === "permission" ? 120000 : 15000,
  );
}
export async function configureInactivity(values: Record<string, unknown>) {
  const status = await inactivity("configure", values);
  await notifications("reconcile");
  return status;
}
