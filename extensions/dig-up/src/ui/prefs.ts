// The extension preferences the daemon needs (battery, index hours, llama-server and model overrides) reach it through
// pushPreferences(): the daemon is started without them. Commands that run often send them only when they changed
// since the last time.

import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { pushPreferences } from "../lib/client";

const KEY = "pushedPreferences";

function current(): string {
  const prefs = getPreferenceValues<Record<string, unknown>>();
  return JSON.stringify([
    prefs.indexOnBattery ?? true,
    prefs.indexHours ?? "",
    prefs.llamaServerPath ?? "",
    prefs.modelFolder ?? "",
  ]);
}

/** Sends the preferences now. */
export async function sendPreferences(): Promise<void> {
  const value = current();
  await pushPreferences();
  await LocalStorage.setItem(KEY, value);
}

/** Sends the preferences if they changed since they were last sent (the menu bar's minute ticks). */
export async function sendPreferencesIfChanged(): Promise<void> {
  const value = current();
  if ((await LocalStorage.getItem<string>(KEY)) === value) return;
  await sendPreferences();
}

let sending: Promise<void> | null = null;

/**
 * Makes sure the daemon has the preferences: await it before a call that starts work they govern (indexing, the model
 * download, the query encoder). Sends them when they changed since they were last sent, or `always` (the search panel,
 * each time it opens); calls while one is on its way share it. Never rejects: a failed send doesn't stop the work.
 */
export function preferencesSent(always = false): Promise<void> {
  sending ??= (always ? sendPreferences() : sendPreferencesIfChanged())
    .catch(() => undefined)
    .finally(() => {
      sending = null;
    });
  return sending;
}
