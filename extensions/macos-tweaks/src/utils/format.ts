import type { TweakState } from "../types";

export function formatValue(tweak: TweakState): string {
  if (tweak.type === "boolean") {
    return tweak.currentValue ? "On" : "Off";
  }
  if (tweak.type === "enum" && tweak.options) {
    const match = tweak.options.find((o) => String(o.value) === String(tweak.currentValue));
    return match?.title ?? String(tweak.currentValue);
  }
  return String(tweak.currentValue);
}

export function formatDefault(tweak: TweakState): string {
  if (tweak.type === "boolean") {
    return tweak.defaultValue ? "On" : "Off";
  }
  if (tweak.type === "enum" && tweak.options) {
    const match = tweak.options.find((o) => String(o.value) === String(tweak.defaultValue));
    return match?.title ?? String(tweak.defaultValue);
  }
  return String(tweak.defaultValue);
}
