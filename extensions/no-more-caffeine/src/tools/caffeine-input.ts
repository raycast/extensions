import { environment } from "@raycast/api";
import { BUILT_IN_PRESETS, caffeineForVolume, getDrinkPresets, servingDescription } from "../utils/drinkPresets";
import { positiveAmount } from "../utils/intakeData";
import { getCustomDrinks } from "../utils/storage";

type DrinkInput = {
  /** Preset ID or exact drink name. For a drink without a preset, give its name and caffeineMg. */
  drink?: string;
  /** Caffeine in milligrams from the user or drink label. Overrides the preset estimate. */
  caffeineMg?: number;
  /** Serving volume in milliliters. Omit to use the default serving when estimating from a preset. */
  servingMl?: number;
};

export async function resolveDrink(input: DrinkInput) {
  const name = input.drink?.trim() || (input.caffeineMg === undefined ? BUILT_IN_PRESETS[0].id : "Caffeine");
  const amount = positiveAmount(input.caffeineMg);
  if (input.caffeineMg !== undefined && amount === undefined) {
    throw new Error("Enter a positive caffeine amount in milligrams.");
  }
  const volume = positiveAmount(input.servingMl);
  if (input.servingMl !== undefined && volume === undefined) {
    throw new Error("Enter a positive serving volume in milliliters.");
  }

  const presets = getDrinkPresets(await getCustomDrinks());
  const key = name.toLowerCase();
  const matches = presets.filter(({ name }) => name.toLowerCase() === key);
  const exactId = presets.find(({ id }) => id === name);
  if (!exactId && matches.length > 1) {
    throw new Error("Several drink presets have that name. List the presets and choose one by ID.");
  }
  const preset = exactId ?? matches[0];

  if (amount === undefined && (!preset || (volume !== undefined && preset.servingMl === undefined))) {
    throw new Error("Use a preset with a known serving size or provide the caffeine amount in milligrams.");
  }
  const serving = volume ?? (amount === undefined ? preset?.servingMl : undefined);
  const estimated = preset && (volume === undefined ? preset.defaultCaffeineMg : caffeineForVolume(preset, volume));
  const caffeineMg = positiveAmount(amount ?? estimated);
  if (caffeineMg === undefined) throw new Error("The serving must contain a positive amount of caffeine.");

  return {
    name: preset?.name ?? name,
    caffeineMg,
    servingMl: serving,
    servingDescription: servingDescription(serving),
    doseSource: amount === undefined ? "preset estimate" : "user supplied",
  };
}

export function parseDrinkTime(value: string | undefined, reference: Date): Date {
  if (value === undefined) return reference;

  const clock = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (clock) {
    const date = new Date(reference);
    date.setHours(Number(clock[1]), Number(clock[2]), 0, 0);
    return date;
  }

  const dateTime =
    /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/.exec(
      value,
    );
  if (dateTime) {
    const midnight = new Date(`${dateTime[1]}T00:00:00Z`);
    const date = new Date(value);
    if (Number.isFinite(+date) && Number.isFinite(+midnight) && midnight.toISOString().startsWith(dateTime[1])) {
      return date;
    }
  }
  throw new Error("Use HH:mm for today or an ISO 8601 date and time, such as 2026-11-19T14:30.");
}

export function commandUrl(
  command: "caffeine-timeline" | "caffeine-history" | "what-if",
  context?: Record<string, string | number>,
): string {
  const url = `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/${command}`;
  return context ? `${url}?context=${encodeURIComponent(JSON.stringify(context))}` : url;
}
