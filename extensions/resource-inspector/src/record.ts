import {
  environment,
  LaunchType,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { open, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { getSnapshot, historyStore, prepare } from "./runtime";
import { inactivity, notifications } from "./inactivity";
export default async function record() {
  await prepare();
  const lock = join(environment.supportPath, "record.lock");
  const stale = await stat(lock).catch(() => null);
  if (stale && Date.now() - stale.mtimeMs > 60000)
    await unlink(lock).catch(() => undefined);
  const handle = await open(lock, "wx", 0o600).catch(() => null);
  if (!handle) return;
  try {
    if ((await historyStore.meta("paused")) === "true") {
      await updateCommandMetadata({
        subtitle: "Recording paused · Resource Inspector Settings to resume",
      });
      if (environment.launchType === LaunchType.UserInitiated)
        await showHUD("Recording is paused");
      return;
    }
    const snapshot = await getSnapshot();
    await historyStore.record(snapshot);
    const idle = await inactivity("observe", { snapshot });
    if (idle.state.enabled && !idle.paused) await notifications("deliver");
    await updateCommandMetadata({
      subtitle: `Last recorded ${new Date().toLocaleTimeString()} · stored locally`,
    });
    if (environment.launchType === LaunchType.UserInitiated)
      await showHUD("Resource usage recorded locally");
  } finally {
    await handle.close();
    await unlink(lock).catch(() => undefined);
  }
}
