import type { Tool } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { formatDateTime, formatMg } from "../utils/statsSvg";
import { saveIntake } from "../utils/storage";
import { parseDrinkTime, resolveDrink } from "./caffeine-input";

type Input = {
  /** Preset ID or name of the drink the user consumed. Use "Caffeine" only if they gave an amount alone. */
  drink: string;
  /** Caffeine in milligrams from the user or drink label. Overrides the preset estimate. */
  caffeineMg?: number;
  /** Serving volume in milliliters. Omit to use the default serving when estimating from a preset. */
  servingMl?: number;
  /** When the drink was consumed. Use HH:mm for today or ISO 8601 for another date. Omit to log now. */
  consumedAt?: string;
};

async function resolveIntake(input: Input) {
  if (!input.drink?.trim()) throw new Error("Enter the drink name, or use Caffeine if only the amount is known.");
  const now = new Date();
  const timestamp = parseDrinkTime(input.consumedAt, now);
  if (timestamp > now) throw new Error("Choose an intake time in the past or omit the time to log now.");
  return { timestamp, drink: await resolveDrink(input) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { timestamp, drink } = await resolveIntake(input);
  return {
    message: "Add this drink to your caffeine history?",
    info: [
      { name: "Drink", value: drink.name },
      { name: "Serving", value: drink.servingDescription },
      { name: "Caffeine", value: `${formatMg(drink.caffeineMg)} (${drink.doseSource})` },
      { name: "Time", value: input.consumedAt === undefined ? "When confirmed" : formatDateTime(timestamp) },
    ],
  };
};

export default async function logCaffeineIntake(input: Input) {
  const { timestamp, drink } = await resolveIntake(input);
  const receipt = {
    id: randomUUID(),
    drink: drink.name,
    caffeineMg: drink.caffeineMg,
    doseSource: drink.doseSource,
    servingMl: drink.servingMl ?? null,
    consumedAt: timestamp.toISOString(),
    localTime: formatDateTime(timestamp),
  };

  await saveIntake({
    id: receipt.id,
    drinkType: drink.name,
    amount: drink.caffeineMg,
    timestamp,
    amountDescription: drink.servingDescription,
  });
  return receipt;
}
