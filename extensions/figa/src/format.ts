import type { FigaWorkspaceContext } from "./api/types";

export type ReadCapabilityResource = "expenses" | "categories" | "recipients";

export interface MonthReference {
  year: number;
  month: number;
}

const RAYCAST_LOCALE = "en-US";

export function getCurrentMonth(): MonthReference {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function getCenteredMonthRange(months = 7): MonthReference & { months: number } {
  const current = getCurrentMonth();
  const offset = Math.floor(months / 2);
  const start = shiftMonth(current, -offset);

  return { ...start, months };
}

function shiftMonth(input: MonthReference, offset: number): MonthReference {
  const date = new Date(input.year, input.month - 1 + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function formatMonthLabel(input: MonthReference, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(RAYCAST_LOCALE, { month: style, year: "numeric" }).format(
    new Date(input.year, input.month - 1, 1),
  );
}

export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(RAYCAST_LOCALE, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function formatUnixDate(value: number | null | undefined): string {
  if (!value) return "No date";

  return new Intl.DateTimeFormat(RAYCAST_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value * 1000));
}

export function getWorkspaceBaseCurrency(context: FigaWorkspaceContext): string {
  return context.schemaVersion === 2 ? context.defaults.baseCurrency : context.workspace.baseCurrency;
}

export function canReadResource(context: FigaWorkspaceContext, resource: ReadCapabilityResource): boolean {
  return context.schemaVersion !== 2 || context.capabilities[resource].read;
}

export function formatReadCapability(resource: ReadCapabilityResource): string {
  return `${resource}.read`;
}

export function canWriteExpenses(context: FigaWorkspaceContext): boolean {
  return context.schemaVersion !== 2 || context.capabilities.expenses.write;
}

export function canRecordExpensePayments(context: FigaWorkspaceContext): boolean {
  return context.schemaVersion !== 2 || context.capabilities.expenses.payments || context.capabilities.expenses.write;
}

export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+.!|-])/g, "\\$1");
}
