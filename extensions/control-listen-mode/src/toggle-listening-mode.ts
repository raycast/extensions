import { environment, showHUD } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { toggleListeningMode } from "swift:../swift";

const unconfirmed =
  "Couldn’t confirm the change. Check your current listening mode.";

type ToggleResult = { ok?: boolean; mode?: string; error?: string };

const messages = new Map<string, string>([
  [
    "no-airpods-output",
    "Connect compatible AirPods and select them as your Mac’s audio output.",
  ],
  [
    "wear-unknown",
    "Couldn’t confirm you’re wearing AirPods. Check Automatic Ear Detection.",
  ],
  ["not-worn", "Put on your AirPods and try again."],
  [
    "outside-toggle-pair",
    "Select Transparency or Noise Cancellation in Control Center first.",
  ],
  [
    "unsupported",
    "Mode switching is unavailable on these AirPods with this macOS version.",
  ],
  ["state-changed", "Your AirPods state changed. Try again."],
  ["write-failed", "macOS rejected the listening mode change."],
  [
    "single-ear-noise-cancellation-rejected",
    "Put on both AirPods or check the setting for Noise Cancellation with one AirPod.",
  ],
  ["unconfirmed", unconfirmed],
  ["busy", "A listening mode change is already in progress."],
  ["lock-failed", "Couldn’t access the extension’s local support folder."],
]);

export default async function Command() {
  let message: string;
  try {
    await mkdir(environment.supportPath, { recursive: true });
    const result = (await toggleListeningMode(
      join(environment.supportPath, "toggle.lock"),
    )) as ToggleResult | null;
    if (result?.ok === true && result.mode === "noise-cancellation") {
      message = "Switched to Noise Cancellation";
    } else if (result?.ok === true && result.mode === "transparency") {
      message = "Switched to Transparency";
    } else {
      message = messages.get(result?.error ?? "") ?? unconfirmed;
    }
  } catch {
    message = unconfirmed;
  }
  await showHUD(message);
}
