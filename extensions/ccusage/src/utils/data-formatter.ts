import { match } from "ts-pattern";
import { Clipboard, showToast, Toast } from "@raycast/api";

export const formatTokens = (tokens: number | undefined): string => {
  if (tokens === undefined) return "0";

  return match(tokens)
    .when(
      (t) => t < 1000,
      (t) => t.toString(),
    )
    .when(
      (t) => t < 1000000,
      (t) => `${(t / 1000).toFixed(2)}K`,
    )
    .otherwise((t) => `${(t / 1000000).toFixed(2)}M`);
};

export const formatTokensAsMTok = (tokens: number | undefined): string => {
  if (tokens === undefined) return "0 MTok";

  const mTokens = tokens / 1000000;
  return `${mTokens.toFixed(2)} MTok`;
};

export const formatCost = (totalCost: number | undefined): string => {
  if (totalCost === undefined) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(totalCost);
};

export const getTokenEfficiency = (inputTokens: number, outputTokens: number): string => {
  if (inputTokens === 0) return "N/A";
  const ratio = outputTokens / inputTokens;
  return `${ratio.toFixed(2)}x`;
};

export const getCostPerMTok = (totalCost: number, totalTokens: number): string => {
  if (totalTokens === 0) return "$0.00/MTok";
  const costPerMTok = (totalCost / totalTokens) * 1000000;
  return `$${costPerMTok.toFixed(2)}/MTok`;
};

export const copyToClipboard = async (text: string, message: string): Promise<void> => {
  try {
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: message,
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy to clipboard",
    });
  }
};

export const getCCUsageCommand = (): string => {
  return "npx ccusage@latest";
};

export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
};

export const formatCostDelta = (todayCost: number, yesterdayCost: number): string => {
  const delta = todayCost - yesterdayCost;
  const sign = delta >= 0 ? "+" : "-";
  const formatted = formatCost(Math.abs(delta));
  if (yesterdayCost === 0) return `${sign}${formatted}`;
  const pct = (Math.abs(delta) / yesterdayCost) * 100;
  return `${sign}${formatted} (${pct.toFixed(1)}%)`;
};

export const formatTokenDelta = (todayTokens: number, yesterdayTokens: number): string => {
  const delta = todayTokens - yesterdayTokens;
  const sign = delta >= 0 ? "+" : "-";
  const formatted = formatTokens(Math.abs(delta));
  if (yesterdayTokens === 0) return `${sign}${formatted}`;
  const pct = (Math.abs(delta) / yesterdayTokens) * 100;
  return `${sign}${formatted} (${pct.toFixed(1)}%)`;
};
