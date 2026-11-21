import type { CaffeineIntake } from "../types";

export function positiveAmount(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

export function parseIntakes(value: unknown): CaffeineIntake[] {
  if (!Array.isArray(value)) throw new Error("Expected a list of caffeine entries.");

  return Array.from(value, (entry: unknown, index) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("id" in entry) ||
      typeof entry.id !== "string" ||
      !entry.id ||
      !("timestamp" in entry) ||
      (typeof entry.timestamp !== "string" && typeof entry.timestamp !== "number") ||
      !("amount" in entry) ||
      !("drinkType" in entry) ||
      typeof entry.drinkType !== "string" ||
      !entry.drinkType.trim()
    ) {
      throw new Error(`Invalid caffeine entry ${index + 1}.`);
    }

    const timestamp = new Date(entry.timestamp);
    const amount = positiveAmount(entry.amount);
    if (!Number.isFinite(+timestamp) || amount === undefined) {
      throw new Error(`Invalid timestamp or caffeine amount in entry ${index + 1}.`);
    }

    return {
      id: entry.id,
      timestamp,
      amount,
      drinkType: entry.drinkType,
      amountDescription:
        "amountDescription" in entry && typeof entry.amountDescription === "string"
          ? entry.amountDescription
          : undefined,
    };
  });
}

export function exportIntakes(intakes: CaffeineIntake[]): string {
  return JSON.stringify({ version: 1, intakes }, null, 2);
}

export function parseIntakeExport(json: string): CaffeineIntake[] {
  const data: unknown = JSON.parse(json);
  if (!data || typeof data !== "object" || !("version" in data) || data.version !== 1 || !("intakes" in data)) {
    throw new Error("Choose a No More Caffeine history export.");
  }
  return parseIntakes(data.intakes);
}
