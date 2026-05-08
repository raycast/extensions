export type BillingBlock = {
  id: string;
  startTime: string;
  endTime: string;
  entries: number;
  isActive: boolean;
  isGap: boolean;
  totalTokens: number;
  costUSD: number;
  models: string[];
  costPerHourUSD?: number;
  projectedCostUSD?: number;
  remainingMinutes?: number;
};

type RawBillingBlock = Partial<BillingBlock> & {
  id?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  entries?: unknown;
  isActive?: unknown;
  isGap?: unknown;
  totalTokens?: unknown;
  costUSD?: unknown;
  models?: unknown;
  burnRate?: unknown;
  projection?: unknown;
};

const numberOrZero = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const optionalNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const normalizeModels = (models: unknown): string[] =>
  Array.isArray(models)
    ? models.filter((model): model is string => typeof model === "string")
    : [];

const getObjectValue = (value: unknown, key: string): unknown =>
  value && typeof value === "object" && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined;

const normalizeBillingBlock = (block: RawBillingBlock): BillingBlock => ({
  id: typeof block.id === "string" ? block.id : "",
  startTime: typeof block.startTime === "string" ? block.startTime : "",
  endTime: typeof block.endTime === "string" ? block.endTime : "",
  entries: numberOrZero(block.entries),
  isActive: block.isActive === true,
  isGap: block.isGap === true,
  totalTokens: numberOrZero(block.totalTokens),
  costUSD: numberOrZero(block.costUSD),
  models: normalizeModels(block.models),
  costPerHourUSD: optionalNumber(getObjectValue(block.burnRate, "costPerHour")),
  projectedCostUSD: optionalNumber(
    getObjectValue(block.projection, "totalCost"),
  ),
  remainingMinutes: optionalNumber(
    getObjectValue(block.projection, "remainingMinutes"),
  ),
});

export const parseBillingBlocks = (stdout: string): BillingBlock[] => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error("Unable to parse ccusage blocks JSON output");
  }

  const blocks =
    parsed && typeof parsed === "object" && "blocks" in parsed
      ? (parsed as { blocks?: unknown }).blocks
      : undefined;

  if (!Array.isArray(blocks)) {
    throw new Error("Expected ccusage blocks output to include a blocks array");
  }

  return (blocks as RawBillingBlock[]).map(normalizeBillingBlock);
};

export const summarizeCurrentBillingBlock = (
  blocks: BillingBlock[],
): BillingBlock | undefined =>
  blocks.find((block) => block.isActive && !block.isGap);
