import { AM_CONTRIBUTION_PERCENTAGE } from "./constants";
import { TaxCalculation } from "./types";

function validateAndParseIncome(value: string): { value: number; error?: string } {
  if (!value.trim()) {
    return { value: 0, error: "Income cannot be empty" };
  }

  const sanitized = value.replace(/[^0-9*.,]/g, "");

  try {
    if (value.includes("*")) {
      const [part1, part2] = sanitized.split("*").map((part) => parseFloat(part.replace(",", ".")));
      if (isNaN(part1) || isNaN(part2)) {
        return { value: 0, error: "Invalid multiplication format" };
      }
      return { value: part1 * part2 };
    }

    const parsed = parseFloat(sanitized.replace(",", "."));
    if (isNaN(parsed)) {
      return { value: 0, error: "Invalid number format" };
    }
    return { value: parsed };
  } catch {
    return { value: 0, error: "Invalid input format" };
  }
}

export function parsePercentage(value: string): number {
  return parseFloat(value.replace("%", "").replace(",", ".")) || 0;
}

export function calculatePayment(
  income: string,
  deduction: string,
  drawPercentage: string,
  defaultPercentage: string,
): TaxCalculation {
  const { value: incomeValue, error: incomeError } = validateAndParseIncome(income);
  if (incomeError) {
    throw new Error(incomeError);
  }

  const { value: deductionValue } = validateAndParseIncome(deduction || "0");
  const drawPercentageValue = parsePercentage(drawPercentage);
  const defaultPercentageValue = parsePercentage(defaultPercentage);

  const argPercentage = drawPercentageValue || defaultPercentageValue || 0;
  const am = (incomeValue / 100) * AM_CONTRIBUTION_PERCENTAGE;
  const taxableIncome = incomeValue - am - deductionValue;
  const tax = Math.floor((taxableIncome / 100) * argPercentage);
  const salary = incomeValue - am - tax;

  return { incomeValue, am, taxableIncome, tax, salary, argPercentage };
}
