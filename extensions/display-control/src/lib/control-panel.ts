import { controls, percentage } from "./m1ddc";
import type { Control, DisplayState, Reading } from "./m1ddc";
import { controlLabels } from "./controls";
import type { ResetDefaults } from "./controls";

const symbols: Record<Control, string> = { volume: "🔊", luminance: "☀", contrast: "◐" };
const resetKeys: Record<Control, string> = { volume: "⌘ 0", luminance: "⌘ ⇧ 0", contrast: "⌘ ⌥ 0" };

function validReading(reading: Reading | undefined): reading is Reading {
  return (
    !!reading &&
    Number.isFinite(reading.current) &&
    Number.isFinite(reading.maximum) &&
    reading.maximum > 0 &&
    reading.current >= 0 &&
    reading.current <= reading.maximum
  );
}

export function characterBar(reading: Reading): string {
  if (!validReading(reading)) return "·".repeat(20);
  const filled = Math.round((reading.current / reading.maximum) * 20);
  return "█".repeat(filled) + "░".repeat(20 - filled);
}

export function controlPanelMarkdown(state: DisplayState | undefined, defaults: ResetDefaults): string {
  return controls
    .map((control) => {
      const value = state?.[control];
      const reading = value?.reading;
      const valid = validReading(reading);
      const status = reading?.unconfirmed ? " (requested)" : value?.error ? " (last known)" : "";
      const level = valid ? `${percentage(reading)}%${status}` : state ? "Unavailable" : "Reading…";
      const defaultLabel =
        defaults[control] === undefined ? "Set a valid default in Preferences." : `Default ${defaults[control]}%`;
      return [
        `**${symbols[control]} ${controlLabels[control]}** ${level}`,
        `\`${valid ? characterBar(reading) : "·".repeat(20)}\``,
        `${defaultLabel}${valid ? ` · Reset \`${resetKeys[control]}\`` : ""}`,
      ].join("  \n");
    })
    .join("\n\n");
}
