export type Unit = "toman" | "rial";

const integerFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function toDisplay(toman: number, unit: Unit = "toman"): string {
  const value = unit === "rial" ? toman * 10 : toman;
  return integerFormatter.format(value);
}

export function unitLabel(unit: Unit = "toman"): string {
  return unit === "rial" ? "Rial" : "Toman";
}

export function formatUsd(n: number): string {
  return usdFormatter.format(n);
}

export function parseAmount(text: string | undefined | null): number | undefined {
  if (!text) return undefined;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  cleaned = cleaned.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  cleaned = cleaned.replace(/\u066B/g, ".");
  cleaned = cleaned.replace(/[,٬\s]/g, "");
  if (!cleaned) return undefined;
  const num = Number(cleaned);
  if (!Number.isFinite(num) || num <= 0) {
    return undefined;
  }
  return num;
}

export function copyValue(n: number): string {
  if (Number.isInteger(n)) {
    return String(n);
  }
  return String(Math.round(n * 100) / 100);
}
