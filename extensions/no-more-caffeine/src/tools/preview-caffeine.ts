import {
  calculateLastCupBy,
  calculateResidualCaffeine,
  calculateTotalResidualCaffeine,
  getBedtimeDate,
  HOUR,
  hoursToPeak,
} from "../utils/caffeineModel";
import { getSettings } from "../utils/preferences";
import { formatDateTime } from "../utils/statsSvg";
import { getIntakes } from "../utils/storage";
import { commandUrl, parseDrinkTime, resolveDrink } from "./caffeine-input";

type Input = {
  /** Preset ID or exact drink name. For a drink without a preset, supply caffeineMg. */
  drink?: string;
  /** Caffeine in milligrams from the user or drink label. Overrides the preset estimate. */
  caffeineMg?: number;
  /** Serving volume in milliliters. Omit to use the default serving when estimating from a preset. */
  servingMl?: number;
  /** Proposed drink time. Use HH:mm for today or ISO 8601 for another date. Omit to preview a drink now. */
  drinkAt?: string;
};

export default async function previewCaffeine(input: Input) {
  const now = new Date();
  const settings = getSettings();
  const bedtime = getBedtimeDate(settings.bedtime, false, now);
  const timestamp = parseDrinkTime(input.drinkAt, now);
  if (timestamp > bedtime) throw new Error("Choose a drink time at or before the next bedtime.");

  const [intakes, drink] = await Promise.all([getIntakes(), resolveDrink(input)]);
  const baseline = calculateTotalResidualCaffeine(intakes, bedtime, settings.halfLife);
  const added = calculateResidualCaffeine({ timestamp, amount: drink.caffeineMg }, bedtime, settings.halfLife);
  const peak = new Date(+timestamp + HOUR * hoursToPeak(settings.halfLife));
  const cutoff = calculateLastCupBy({
    amount: drink.caffeineMg,
    baseline,
    bedtime,
    halfLife: settings.halfLife,
    threshold: settings.maxCaffeineAtBedtime,
  });

  return {
    drink: drink.name,
    servingMl: drink.servingMl ?? null,
    caffeineMg: drink.caffeineMg,
    doseSource: drink.doseSource,
    drinkAt: timestamp.toISOString(),
    localDrinkTime: formatDateTime(timestamp),
    bedtime: bedtime.toISOString(),
    localBedtime: formatDateTime(bedtime),
    bedtimeLimitMg: settings.maxCaffeineAtBedtime,
    estimatedCaffeineAtBedtimeMg: baseline,
    estimatedCaffeineAtBedtimeWithDrinkMg: baseline + added,
    addedCaffeineAtBedtimeMg: added,
    addedDrinkPeaksAfterBedtime: peak > bedtime,
    lastCupBy: cutoff
      ? { time: cutoff.toISOString(), localTime: formatDateTime(cutoff), alreadyPassed: cutoff < now }
      : null,
    saved: false,
    whatIfUrl: commandUrl("what-if", { drinkAt: timestamp.toISOString(), caffeineMg: drink.caffeineMg }),
  };
}
