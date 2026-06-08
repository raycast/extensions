import { runToggle } from "./commands/run-toggle";

/** `Toggle Mute` (no-view). Sends the configured Discord mute keybind, best-effort. */
export default async function ToggleMuteCommand(): Promise<void> {
  await runToggle("toggleMute");
}
