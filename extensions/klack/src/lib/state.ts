import { runAppleScript } from "@raycast/utils";
import { writeCachedState } from "./cache";
import { classifyAppleScriptError } from "./errors";
import { ensureInstalled } from "./klack";
import type { KlackState } from "./types";

const SCRIPT = `tell application "Klack"
  set s1 to current status
  set s2 to current sleep status
  set s3 to current switch
  set s4 to current volume
  return (s1 as string) & "|" & (s2 as string) & "|" & s3 & "|" & (s4 as string)
end tell`;

export async function getState(): Promise<KlackState> {
  await ensureInstalled();
  try {
    const [enabled, sleeping, switchName, volume] = (await runAppleScript(SCRIPT)).split("|");
    const state: KlackState = {
      enabled: enabled === "true",
      sleeping: sleeping === "true",
      switch: switchName.trim(),
      volume: Number(volume),
    };
    writeCachedState(state);
    return state;
  } catch (err) {
    throw classifyAppleScriptError(err);
  }
}
