import { match } from "ts-pattern";

export const formatNumber = (num: number | undefined): string => {
  if (num === undefined) return "0";
  return new Intl.NumberFormat("en-US").format(num);
};

export const formatDateTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

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

export const getCCUsageCommand = (): string => {
  return "npx ccusage@latest";
};
