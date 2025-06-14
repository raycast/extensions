import { match } from "ts-pattern";

export const formatTokens = (tokens: number | null | undefined): string => {
  if (tokens === null || tokens === undefined) return "0";

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

export const formatTokensAsMTok = (tokens: number | null | undefined): string => {
  if (tokens === null || tokens === undefined) return "0 MTok";

  const mTokens = tokens / 1000000;
  return `${mTokens.toFixed(2)} MTok`;
};

export const formatCost = (cost: number | null | undefined): string => {
  if (cost === null || cost === undefined) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cost);
};

export const getTokenEfficiency = (inputTokens: number, outputTokens: number): string => {
  if (inputTokens === 0) return "N/A";
  const ratio = outputTokens / inputTokens;
  return `${ratio.toFixed(2)}x`;
};

export const getCostPerMTok = (cost: number, totalTokens: number): string => {
  if (totalTokens === 0) return "$0.00/MTok";
  const costPerMTok = (cost / totalTokens) * 1000000;
  return `$${costPerMTok.toFixed(2)}/MTok`;
};
