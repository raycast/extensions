import PresetEditor from "./components/PresetEditor";
import { scratchPresetName } from "./lib/actions";

/**
 * Pin the fans to a specific speed.
 *
 * Macs Fan Control only ever applies a *preset*, so this writes into one
 * dedicated preset (named in preferences) and activates it. Overwriting a
 * single reserved preset keeps the user's own presets untouched.
 */
export default function Command() {
  return <PresetEditor submitTitle="Apply Speed" initialName={scratchPresetName()} lockName activateAfterSave />;
}
