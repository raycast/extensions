import { ModelInfo, SortMode } from "./types";

export function filterModels(
  models: ModelInfo[],
  searchText: string,
): ModelInfo[] {
  if (!searchText) return models;
  const lowerSearch = searchText.toLowerCase();
  return models.filter(
    (model) =>
      model.name.toLowerCase().includes(lowerSearch) ||
      model.id.toLowerCase().includes(lowerSearch),
  );
}

export const formatPrice = (value: number): string => {
  const perMillion = value * 1_000_000;
  if (perMillion === 0) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.max(perMillion, 0.01));
};

export const formatContextLength = (tokens: number): string => {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(tokens);
};

export const getFuzzyDateGroup = (date: Date): string => {
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 3600 * 24),
  );
  const diffMonths =
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth());

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return "This Week";
  } else if (diffDays < 14) {
    return "Last Week";
  } else if (diffMonths === 0) {
    return "This Month";
  } else if (diffMonths === 1) {
    return "Last Month";
  } else {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
    }).format(date);
  }
};

export const groupByFuzzyDate = (
  models: ModelInfo[],
): Record<string, ModelInfo[]> => {
  const grouped: Record<string, ModelInfo[]> = {};

  models.forEach((model) => {
    const date = new Date(model.created * 1000);
    const group = getFuzzyDateGroup(date);
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(model);
  });

  // Sort models within each group by newest first
  Object.values(grouped).forEach((groupModels) => {
    groupModels.sort((a, b) => (b.created || 0) - (a.created || 0));
  });

  return grouped;
};

const sortKeys: Record<SortMode, (a: ModelInfo, b: ModelInfo) => number> = {
  newest: (a, b) =>
    (b.created || 0) - (a.created || 0) || a.name.localeCompare(b.name),
  context: (a, b) =>
    b.context_length - a.context_length || a.name.localeCompare(b.name),
  price: (a, b) =>
    a.pricing.prompt - b.pricing.prompt ||
    a.pricing.completion - b.pricing.completion ||
    a.name.localeCompare(b.name),
};

export const sortModels = (models: ModelInfo[], mode: SortMode): ModelInfo[] =>
  [...models].sort(sortKeys[mode]);
