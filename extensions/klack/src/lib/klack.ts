import { getApplications } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { isInstallVerifiedFresh, markInstallVerified, writeCachedState } from "./cache";
import { KLACK_BUNDLE_ID } from "./constants";
import { KlackError, classifyAppleScriptError } from "./errors";
import type { SwitchName } from "./types";

let installCheck: Promise<void> | null = null;

export async function ensureInstalled() {
  if (isInstallVerifiedFresh()) return;
  if (installCheck) return installCheck;
  // Clear on any rejection so a transient getApplications() failure doesn't poison every future caller.
  installCheck = (async () => {
    try {
      const apps = await getApplications();
      if (!apps.some((a) => a.bundleId === KLACK_BUNDLE_ID)) {
        throw new KlackError(
          "not-installed",
          "Install Klack from tryklack.com or the Mac App Store to use this extension.",
        );
      }
      markInstallVerified();
    } catch (err) {
      installCheck = null;
      throw err;
    }
  })();
  return installCheck;
}

async function tell<T>(script: string, parseResult: (raw: string) => T): Promise<T> {
  await ensureInstalled();
  try {
    return parseResult(await runAppleScript(`tell application "Klack" to ${script}`));
  } catch (err) {
    throw classifyAppleScriptError(err);
  }
}

const asBool = (r: string) => r === "true";
const asInt = (r: string) => Number(r);

async function mutateBool(script: string, key: "enabled" | "sleeping") {
  const value = await tell(script, asBool);
  writeCachedState({ [key]: value });
  return value;
}

export const klack = {
  toggle: () => mutateBool("toggle", "enabled"),
  turnOn: () => mutateBool("turn on", "enabled"),
  turnOff: () => mutateBool("turn off", "enabled"),
  wakeUp: () => mutateBool("wake up", "sleeping"),
  isEnabled: () => tell("current status", asBool),
  isSleeping: () => tell("current sleep status", asBool),
  // AppleScript enumerator: lowercased, unquoted ("japanese black", not "Japanese Black").
  setSwitch: async (name: SwitchName) => {
    await tell(`switch ${name.toLowerCase()}`, () => undefined);
    writeCachedState({ switch: name });
  },
  currentSwitch: () => tell("current switch", (r) => r.trim()),
  setVolume: async (value: number) => {
    const applied = await tell(`volume ${Math.max(0, Math.min(100, Math.round(value)))}`, asInt);
    writeCachedState({ volume: applied });
    return applied;
  },
  currentVolume: () => tell("current volume", asInt),
};
