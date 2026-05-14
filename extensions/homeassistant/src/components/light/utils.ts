import { RGB } from "@lib/color";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { ensureMinMax } from "@lib/utils";

export function getLightRGBFromState(state: State): RGB | undefined {
  const rgb = state.attributes.rgb_color;
  if (rgb && Array.isArray(rgb) && rgb.length === 3) {
    return {
      r: rgb[0],
      g: rgb[1],
      b: rgb[2],
    };
  }
  return undefined;
}

export function getLightMinMaxK(state: State): [min: number | undefined, max: number | undefined] {
  const min_color_temp_kelvin = state.attributes.min_color_temp_kelvin as number | undefined;
  const max_color_temp_kelvin = state.attributes.max_color_temp_kelvin as number | undefined;
  if (min_color_temp_kelvin && max_color_temp_kelvin && max_color_temp_kelvin > min_color_temp_kelvin) {
    return ensureMinMax(min_color_temp_kelvin, max_color_temp_kelvin);
  }
  return [undefined, undefined];
}

export function hasLightBrightnessSupport(state: State): boolean {
  const modes = state.attributes.supported_color_modes;
  if (modes && Array.isArray(modes) && (modes.includes("brightness") || modes.includes("color_temp"))) {
    // we assume that brightness support exists when color_temp is present.
    // This is required to support which does not provide brightness support mode
    return true;
  }
  return false;
}

export function getLightBrightnessValues(): number[] {
  const result: number[] = [];
  for (let i = 100; i >= 0; i = i - 10) {
    result.push(i);
  }
  return result;
}

export function ceilRound50(value: number): number {
  return Math.ceil(value / 50) * 50;
}

export function floorRound50(value: number): number {
  return Math.floor(value / 50) * 50;
}

export async function callLightBrightnessService(state: State, brightnessPerentable: number) {
  await ha.callService("light", "turn_on", { entity_id: state.entity_id, brightness_pct: `${brightnessPerentable}` });
}

export function getLightCurrentBrightnessPercentage(state: State): number | undefined {
  const b = state.attributes.brightness || undefined;
  if (b !== undefined) {
    const bv = parseInt(b);
    if (!isNaN(bv)) {
      const percent = (bv / 255) * 100;
      return Math.round(percent);
    }
  }
}
