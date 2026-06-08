import { runToggle } from "./commands/run-toggle";

/** `Toggle Deafen` (no-view). Sends the configured Discord deafen keybind, best-effort. */
export default async function ToggleDeafenCommand(): Promise<void> {
  await runToggle("toggleDeafen");
}
