import { convertFormTemperatureToActual, KeyLight } from "../elgato";
import { getPresets } from "../presets";

export default async function tool(input: { presetId: string }) {
  const presets = await getPresets();
  const preset = presets.find((p) => p.id === input.presetId);
  if (!preset) {
    throw new Error(`Preset with Id "${input.presetId}" not found`);
  }

  const keylight = await KeyLight.discover();

  await keylight.update({
    brightness: preset.settings.brightness,
    temperature: preset.settings.temperature ? convertFormTemperatureToActual(preset.settings.temperature) : undefined,
  });
}
