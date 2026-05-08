import {
  formatCurrency,
  formatDuration,
  formatNumber,
  formatTime,
} from "../../common/lib/formatUsageValue/formatUsageValue";
import type { BillingBlock } from "./billingBlockSummary/billingBlockSummary";

export const renderBlockDetail = (
  block: BillingBlock,
): string => `# Current 5-Hour Block

| Metric | Value |
| --- | ---: |
| Window | ${formatTime(block.startTime)} - ${formatTime(block.endTime)} |
| Cost | ${formatCurrency(block.costUSD)} |
| Projected Cost | ${block.projectedCostUSD ? formatCurrency(block.projectedCostUSD) : "n/a"} |
| Burn Rate | ${block.costPerHourUSD ? `${formatCurrency(block.costPerHourUSD)}/hour` : "n/a"} |
| Remaining | ${block.remainingMinutes ? formatDuration(block.remainingMinutes) : "n/a"} |
| Tokens | ${formatNumber(block.totalTokens)} |
| Entries | ${formatNumber(block.entries)} |
| Models | ${block.models.length > 0 ? block.models.join(", ") : "Unknown model"} |
`;
