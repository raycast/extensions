import { Color, List } from "@raycast/api";

export function formatMoney(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

export function leftAccessories(left: number, total: number, currency: string): List.Item.Accessory[] {
  const leftText = formatMoney(left, currency);
  return [
    left < 0
      ? { tag: { value: leftText, color: Color.Red }, tooltip: "Overspent" }
      : { text: leftText, tooltip: "Left" },
    { text: `of ${formatMoney(total, currency)}` },
  ];
}

export function leftText(left: number, total: number, currency: string): string {
  return left < 0
    ? `${formatMoney(-left, currency)} over ${formatMoney(total, currency)}`
    : `${formatMoney(left, currency)} left of ${formatMoney(total, currency)}`;
}
