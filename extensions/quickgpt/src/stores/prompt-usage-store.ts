import { LocalStorage } from "@raycast/api";
import type { PromptProps } from "../managers/prompt-manager";
import { isPromptEligibleForUsageStats, PromptUsageRow, PromptUsageSummary } from "../utils/prompt-usage-utils";

export interface PromptUsageRecord {
  identifier: string;
  titleSnapshot: string;
  pathSnapshot?: string;
  filePathSnapshot?: string;
  totalCount: number;
  lastUsedAt?: string;
  dailyCounts: Record<string, number>;
}

interface StorageAdapter {
  getItem<T extends string | number | boolean>(key: string): Promise<T | undefined>;
  setItem(key: string, value: string | number | boolean): Promise<void>;
  removeItem(key: string): Promise<void>;
}

type PromptUsageRecordMap = Record<string, PromptUsageRecord>;
type PromptUsageSummaryMap = Record<string, PromptUsageSummary>;

const STORAGE_KEY = "promptUsageStats_v1";
const RETENTION_DAYS = 90;

export class PromptUsageStore {
  constructor(
    private storage: StorageAdapter,
    private storageKey = STORAGE_KEY,
  ) {}

  async recordUsage(prompt: PromptProps, _actionName: string, usedAt: Date = new Date()): Promise<void> {
    if (!isPromptEligibleForUsageStats(prompt)) {
      return;
    }

    const records = await this.readRecordMap(usedAt);
    const currentRecord = records[prompt.identifier];
    const bucketKey = formatDateKey(usedAt);

    const nextRecord: PromptUsageRecord = {
      identifier: prompt.identifier,
      titleSnapshot: prompt.title,
      pathSnapshot: prompt.path,
      filePathSnapshot: prompt.filePath,
      totalCount: (currentRecord?.totalCount || 0) + 1,
      lastUsedAt: usedAt.toISOString(),
      dailyCounts: pruneDailyCounts(
        {
          ...(currentRecord?.dailyCounts || {}),
          [bucketKey]: (currentRecord?.dailyCounts?.[bucketKey] || 0) + 1,
        },
        usedAt,
      ),
    };

    records[prompt.identifier] = nextRecord;
    await this.writeRecordMap(records, usedAt);
  }

  async getUsageSummaryMap(referenceDate: Date = new Date()): Promise<PromptUsageSummaryMap> {
    const records = await this.readRecordMap(referenceDate);
    return Object.fromEntries(
      Object.entries(records).map(([identifier, record]) => [
        identifier,
        {
          totalCount: record.totalCount || 0,
          recent7d: countRecentUsage(record.dailyCounts, referenceDate, 7),
          recent30d: countRecentUsage(record.dailyCounts, referenceDate, 30),
          lastUsedAt: record.lastUsedAt,
        },
      ]),
    );
  }

  async getPromptUsageRows(allPrompts: PromptProps[], referenceDate: Date = new Date()): Promise<PromptUsageRow[]> {
    const summaryMap = await this.getUsageSummaryMap(referenceDate);

    // Usage is recorded per identifier, so prompts sharing one must collapse into a single row.
    // The first occurrence wins to match the prompt that PromptManager.findPrompt resolves.
    const uniquePrompts = new Map<string, PromptProps>();
    for (const prompt of allPrompts) {
      if (isPromptEligibleForUsageStats(prompt) && !uniquePrompts.has(prompt.identifier)) {
        uniquePrompts.set(prompt.identifier, prompt);
      }
    }

    return Array.from(uniquePrompts.values()).map((prompt) => {
      const summary = summaryMap[prompt.identifier] || {
        totalCount: 0,
        recent7d: 0,
        recent30d: 0,
        lastUsedAt: undefined,
      };

      return {
        identifier: prompt.identifier,
        title: prompt.title,
        path: prompt.path,
        filePath: prompt.filePath,
        ...summary,
      };
    });
  }

  async clearAllUsageStats(): Promise<void> {
    await this.storage.removeItem(this.storageKey);
  }

  private async readRecordMap(referenceDate: Date = new Date()): Promise<PromptUsageRecordMap> {
    const storedValue = await this.storage.getItem<string>(this.storageKey);
    if (!storedValue || typeof storedValue !== "string") {
      return {};
    }

    try {
      const parsed = JSON.parse(storedValue) as PromptUsageRecordMap;
      const normalized = Object.fromEntries(
        Object.entries(parsed || {}).flatMap(([identifier, record]) => {
          if (!record || typeof record !== "object") {
            return [];
          }

          const nextRecord = normalizeRecord(identifier, record, referenceDate);
          return nextRecord ? [[identifier, nextRecord]] : [];
        }),
      );

      return normalized;
    } catch (error) {
      console.error("Failed to parse prompt usage stats:", error);
      return {};
    }
  }

  private async writeRecordMap(records: PromptUsageRecordMap, referenceDate: Date = new Date()): Promise<void> {
    const normalized = Object.fromEntries(
      Object.entries(records).map(([identifier, record]) => [
        identifier,
        normalizeRecord(identifier, record, referenceDate),
      ]),
    );

    await this.storage.setItem(this.storageKey, JSON.stringify(normalized));
  }
}

function normalizeRecord(identifier: string, record: PromptUsageRecord, referenceDate: Date): PromptUsageRecord {
  return {
    identifier,
    titleSnapshot: record.titleSnapshot || identifier,
    pathSnapshot: record.pathSnapshot,
    filePathSnapshot: record.filePathSnapshot,
    totalCount: Math.max(0, Number(record.totalCount) || 0),
    lastUsedAt: record.lastUsedAt,
    dailyCounts: pruneDailyCounts(record.dailyCounts || {}, referenceDate),
  };
}

function pruneDailyCounts(dailyCounts: Record<string, number>, referenceDate: Date): Record<string, number> {
  return Object.fromEntries(
    Object.entries(dailyCounts)
      .filter(([dateKey, count]) => {
        if (!Number.isFinite(count) || count <= 0) return false;

        const daysDiff = differenceInCalendarDays(referenceDate, parseDateKey(dateKey));
        return daysDiff >= 0 && daysDiff < RETENTION_DAYS;
      })
      .map(([dateKey, count]) => [dateKey, Math.floor(count)]),
  );
}

function countRecentUsage(dailyCounts: Record<string, number>, referenceDate: Date, lookbackDays: number): number {
  return Object.entries(dailyCounts).reduce((total, [dateKey, count]) => {
    const daysDiff = differenceInCalendarDays(referenceDate, parseDateKey(dateKey));
    if (daysDiff >= 0 && daysDiff < lookbackDays) {
      return total + count;
    }

    return total;
  }, 0);
}

function differenceInCalendarDays(laterDate: Date, earlierDate: Date): number {
  const later = new Date(laterDate.getFullYear(), laterDate.getMonth(), laterDate.getDate());
  const earlier = new Date(earlierDate.getFullYear(), earlierDate.getMonth(), earlierDate.getDate());
  const diffMs = later.getTime() - earlier.getTime();
  return Math.floor(diffMs / 86400000);
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map((value) => Number(value));
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const promptUsageStore = new PromptUsageStore(LocalStorage);

export default promptUsageStore;
