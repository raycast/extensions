import type { FigaExpense, FigaTag, FigaWorkspaceContext } from "./api/types";

export type ReadCapabilityResource = "expenses" | "categories" | "recipients" | "tags";

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

export function formatMoney(cents: number | null, currency: string): string {
  if (cents === null) return "Amount unknown";
  try {
    return new Intl.NumberFormat(RAYCAST_LOCALE, {
      style: "currency",
      currency,
      currencyDisplay: "code",
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
  return context.schemaVersion !== 1 ? context.defaults.baseCurrency : context.workspace.baseCurrency;
}

export function canReadResource(context: FigaWorkspaceContext, resource: ReadCapabilityResource): boolean {
  if (resource === "tags") return context.schemaVersion === 3 && context.capabilities.tags.read;
  return context.schemaVersion === 1 || context.capabilities[resource].read;
}

export function formatReadCapability(resource: ReadCapabilityResource): string {
  return `${resource}.read`;
}

export function canWriteExpenses(context: FigaWorkspaceContext): boolean {
  return context.schemaVersion === 1 || context.capabilities.expenses.write;
}

export function canRecordExpensePayments(context: FigaWorkspaceContext): boolean {
  return context.schemaVersion === 1 || context.capabilities.expenses.payments || context.capabilities.expenses.write;
}

export function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+.!|-])/g, "\\$1");
}

export function formatExpenseAmount(expense: FigaExpense, currency: string): string {
  if (expense.bill?.state === "unknown") return "Amount unknown";
  const amount = formatMoney(expense.amount, currency);
  if (expense.amount === null) return amount;
  const estimated = expense.bill?.state === "estimated" || expense.money?.amountState === "estimated";
  return `${amount}${estimated ? " (estimated)" : ""}${expense.money?.fxIsEstimated ? " (estimated FX)" : ""}${expense.money?.amountState === "unknown" ? " (base valuation unavailable)" : ""}`;
}

export function formatExpenseDate(expense: FigaExpense): string {
  if (!expense.isPaid && expense.dueBy != null) {
    return `${formatUnixDate(expense.scheduledDate ?? expense.expenseDate)} – ${formatUnixDate(expense.dueBy)}`;
  }
  return formatUnixDate(expense.expenseDate);
}

export function getExpenseTagNames(expense: Pick<FigaExpense, "tagIds">, tags: FigaTag[]): string[] {
  const ids = new Set(expense.tagIds ?? []);
  return tags.filter((tag) => ids.has(tag.id)).map((tag) => tag.name);
}
