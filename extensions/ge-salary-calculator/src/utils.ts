export const WEEKS_PER_MONTH = 4.333;

export type TaxRegime = "employee" | "small_ie" | "micro";
export type InputMode = "gross" | "net";

export interface LastCalc {
  gross: number;
  net: number;
  regime: TaxRegime;
  hoursPerDay: number;
  daysPerWeek: number;
}

export function calcGross(monthly: number, hoursPerDay: number, daysPerWeek: number) {
  const hoursPerWeek = hoursPerDay * daysPerWeek;
  const hoursPerMonth = hoursPerWeek * WEEKS_PER_MONTH;
  const hourly = monthly / hoursPerMonth;
  return { hourly, daily: hourly * hoursPerDay, weekly: hourly * hoursPerWeek, monthly, yearly: monthly * 12 };
}

// employee: 20% income tax + 2% pension = 78% net
// small_ie: 1% turnover tax = 99% net
// micro: no tax
export function applyTax(gross: number, regime: TaxRegime): number {
  if (regime === "employee") return gross * 0.78;
  if (regime === "small_ie") return gross * 0.99;
  return gross;
}

export function reverseToGross(net: number, regime: TaxRegime): number {
  if (regime === "employee") return net / 0.78;
  if (regime === "small_ie") return net / 0.99;
  return net;
}

export function regimeLabel(regime: TaxRegime): string {
  if (regime === "employee") return "−20% income tax −2% pension";
  if (regime === "small_ie") return "−1% turnover tax";
  return "no deductions";
}
