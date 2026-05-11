import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "../formatUsageValue/formatUsageValue";
import type { DailyUsage, UsageTotals } from "../usageSummary/usageSummary";

export const renderTotalsDetail = (
  title: string,
  totals: UsageTotals,
): string => `# ${title}

| Metric | Value |
| --- | ---: |
| Cost | ${formatCurrency(totals.costUSD)} |
| Total Tokens | ${formatNumber(totals.totalTokens)} |
| Input Tokens | ${formatNumber(totals.inputTokens)} |
| Output Tokens | ${formatNumber(totals.outputTokens)} |
| Cache Creation Tokens | ${formatNumber(totals.cacheCreationTokens)} |
| Cache Read Tokens | ${formatNumber(totals.cacheReadTokens)} |
`;

export const renderDayDetail = (
  day: DailyUsage,
): string => `# ${formatDate(day.date)}

| Metric | Value |
| --- | ---: |
| Cost | ${formatCurrency(day.costUSD)} |
| Total Tokens | ${formatNumber(day.totalTokens)} |
| Input Tokens | ${formatNumber(day.inputTokens)} |
| Output Tokens | ${formatNumber(day.outputTokens)} |
| Cache Creation Tokens | ${formatNumber(day.cacheCreationTokens)} |
| Cache Read Tokens | ${formatNumber(day.cacheReadTokens)} |
| Models | ${day.models.length > 0 ? day.models.join(", ") : "Unknown model"} |
`;
