import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  notionMaxBatchSize?: string;
};

const DEFAULT_MAX_BATCH_SIZE = 20;
const MIN_BATCH_SIZE = 1;

const getConfiguredMaxBatchSize = (): number => {
  const { notionMaxBatchSize } = getPreferenceValues<Preferences>();
  const parsed = Number(notionMaxBatchSize);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_MAX_BATCH_SIZE;
  }

  return Math.max(MIN_BATCH_SIZE, Math.floor(parsed));
};

export const getNotionBatchSize = (totalNotes: number): number => {
  if (totalNotes <= 0) return MIN_BATCH_SIZE;
  const maxBatchSize = getConfiguredMaxBatchSize();
  return Math.min(totalNotes, maxBatchSize);
};
