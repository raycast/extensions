import { CssColor, DeepPartial, HasId, Id, Light, Scene } from "../lib/types";
import type HueClient from "../lib/HueClient";
import type { Hue } from "../hooks/useHue";
import React from "react";
import { Icon, Image, showToast, Toast } from "@raycast/api";
import { merge } from "./collections";
import { logError } from "./errors";
import { getSceneChanges } from "./hueResources";

export function getIconForColor(color: CssColor): Image {
  return { source: Icon.CircleFilled, tintColor: { light: color.value, dark: color.value, adjustContrast: false } };
}

export async function applyUpdate(
  { hueBridgeActor, lights, scenes, setLights, setScenes }: Hue,
  update: {
    canExecute?: () => boolean;
    lights: Map<Id, DeepPartial<Light>>;
    scene?: Scene;
    request: (hueClient: HueClient) => Promise<unknown>;
    success: string;
    failure: string;
  },
) {
  try {
    // A pushed Set Scene holds the Hue object it was pushed with, so the client is read as it is now.
    const { hueClient } = hueBridgeActor.getSnapshot().context;
    if (hueClient === undefined) throw new Error("Not connected to Hue Bridge.");
    if (update.canExecute && !update.canExecute()) return;
    // Rooms and zones follow from their lights while rendering.
    const settles = [
      optimisticUpdates(update.lights, setLights),
      optimisticUpdates(getSceneChanges(scenes, lights, update.lights, update.scene), setScenes),
    ];
    const settle = (succeeded: boolean) => settles.forEach((settle) => settle(succeeded));
    await update.request(hueClient).then(
      () => settle(true),
      (error) => {
        settle(false);
        throw error;
      },
    );
    await showToast({ style: Toast.Style.Success, title: update.success });
  } catch (error) {
    logError(error);
    await showToast({
      style: Toast.Style.Failure,
      title: update.failure,
      message: error instanceof Error ? error.message : undefined,
    });
  }
}

// The optimistic writes whose request is pending, oldest first, by resource ID and property. Each holds the value it
// replaced: a failed write restores it, or hands it to the next write, which then restores it if it fails too.
const pendingWrites = new Map<string, PendingWrite[]>();
type PendingWrite = { id: Id; key: string; before: unknown };

function queueOf(id: Id, key: string) {
  const queueKey = `${id}/${key}`;
  if (!pendingWrites.has(queueKey)) pendingWrites.set(queueKey, []);
  return pendingWrites.get(queueKey)!;
}

// Loads and events report the bridge's state, which is what failures of all pending writes go back to.
export function rebasePendingWrites(resources: HasId[]) {
  for (const { id, ...properties } of resources) {
    for (const [key, value] of Object.entries(properties)) {
      const oldest = pendingWrites.get(`${id}/${key}`)?.[0];
      if (oldest) oldest.before = merge(oldest.before, value);
    }
  }
}

function optimisticUpdates<T extends HasId>(
  changes: Map<Id, DeepPartial<T>>,
  setState: React.Dispatch<React.SetStateAction<T[]>>,
): (succeeded: boolean) => void {
  // Setting cached state writes the whole list to the cache, even when nothing changes.
  if (changes.size === 0) return () => {};

  const writes: PendingWrite[] = [];
  setState((items: T[]) =>
    items.map((item) => {
      const change = changes.get(item.id);
      if (!change) return item;
      const updated = { ...item } as Record<string, unknown>;
      // Skips properties the item lacks, so an optimistic update can't give a plug dimming.
      for (const [key, value] of Object.entries(change)) {
        if (!(key in item) || value === undefined) continue;
        const write = { id: item.id, key, before: updated[key] };
        writes.push(write);
        queueOf(item.id, key).push(write);
        updated[key] = merge(write.before, value);
      }
      return updated as T;
    }),
  );

  // A success settles the older writes too, as the bridge now has a newer value.
  return (succeeded: boolean): void => {
    const restores = new Map<Id, Record<string, unknown>>();
    for (const write of writes) {
      const { id, key, before } = write;
      const queue = queueOf(id, key);
      const index = queue.indexOf(write);
      if (index === -1) continue;
      if (succeeded) queue.splice(0, index + 1);
      else {
        if (index === queue.length - 1) restores.set(id, { ...restores.get(id), [key]: before });
        else queue[index + 1].before = before;
        queue.splice(index, 1);
      }
    }
    if (restores.size > 0)
      setState((items) => items.map((item) => (restores.has(item.id) ? { ...item, ...restores.get(item.id) } : item)));
  };
}
