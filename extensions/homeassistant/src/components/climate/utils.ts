import type { State } from "../../lib/haapi";

const TEMPERATURE_DECIMAL_PLACES = 6;
const STEP_ROUNDING_TOLERANCE = 1e-9;
const TARGET_TEMPERATURE_FEATURE = 1;
const MAX_TEMPERATURE_OPTIONS = 1000;

export function climateOptions(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function isAirConditioner(state: State): boolean {
  return state.entity_id.startsWith("climate.") && climateOptions(state.attributes.hvac_modes).includes("cool");
}

export function isClimateAvailable(state: State): boolean {
  return state.state !== "unavailable" && state.state !== "unknown";
}

export function climateLabel(value: string): string {
  const label = value.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function climateTemperature(state: State, value: unknown): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value}${state.attributes.temperature_unit || "°"}`
    : "Not reported";
}

export function climateTemperatures(state: State): number[] {
  const { min_temp: min, max_temp: max, temperature: target, supported_features: features } = state.attributes;
  const step = state.attributes.target_temp_step ?? (state.attributes.temperature_unit === "°F" ? 1 : 0.5);
  if (
    !(features & TARGET_TEMPERATURE_FEATURE) ||
    ![min, max, step, target].every((value) => typeof value === "number" && Number.isFinite(value)) ||
    step <= 0 ||
    max < min ||
    state.state === "heat_cool"
  ) {
    return [];
  }
  const count = Math.floor((max - min) / step + STEP_ROUNDING_TOLERANCE) + 1;
  if (count > MAX_TEMPERATURE_OPTIONS) return [];
  return Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(TEMPERATURE_DECIMAL_PLACES)));
}
