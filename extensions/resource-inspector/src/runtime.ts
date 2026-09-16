import { environment } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Snapshot } from "./model";
import { nativeCall } from "./native";
import { listContainers } from "./containers";
import { HistoryStore } from "./storage";
import { trackingScope } from "./preferences";
import { trackedSnapshot } from "./tracking";
export const binary = join(environment.assetsPath, "inspector");
export const databasePath = join(environment.supportPath, "history.sqlite");
export const historyStore = new HistoryStore(binary, databasePath);
export async function prepare() {
  await mkdir(environment.supportPath, { recursive: true, mode: 0o700 });
}
export async function getSnapshot(): Promise<Snapshot> {
  const [native, containers] = await Promise.allSettled([
    nativeCall<Omit<Snapshot, "containers">>(binary, "snapshot"),
    listContainers(),
  ]);
  if (native.status === "rejected") throw native.reason;
  if (!native.value.processes.length)
    throw new Error(
      "macOS did not return any process measurements. Run this command from Raycast.",
    );
  return trackedSnapshot(
    {
      ...native.value,
      containers: containers.status === "fulfilled" ? containers.value : [],
      containerError:
        containers.status === "rejected"
          ? String(
              containers.reason instanceof Error
                ? containers.reason.message
                : containers.reason,
            )
          : undefined,
    },
    trackingScope(),
  );
}
