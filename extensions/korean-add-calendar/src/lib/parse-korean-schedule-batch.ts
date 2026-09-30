import { ParseOptions, ParseResult, ParsedSchedule, parseKoreanSchedule } from "./parse-korean-schedule";

export interface ParsedBatchItem {
  input: string;
  value: ParsedSchedule;
  inheritedDate: boolean;
}

export interface ParsedBatchError {
  input: string;
  error: string;
}

export interface ParseBatchResult {
  items: ParsedBatchItem[];
  errors: ParsedBatchError[];
  isBatch: boolean;
  tooManyItems: boolean;
}

export interface BatchRetrySnapshot {
  sentence: string;
  batch: ParseBatchResult;
}

export const MAX_BATCH_ITEMS = 3;
const BATCH_TOKEN_PATTERN = /\s*(,|;|그리고|하고)\s*/gu;
const DATE_TIME_CUE_AT_START_PATTERN =
  /^(?:오늘|내일|모레|이번\s*주|다음\s*주|담\s*주|다담\s*주|다다음\s*주|이번\s*달|이\s*달|다음\s*달|담\s*달|매\s*(?:일|주|월)|[월화수목금토일](?:요일|욜)|(?:(?:내년|[0-9]{4}년)\s*)?[0-9]{1,2}월\s*[0-9]{1,2}일|[0-9]{1,2}일(?:\s*(?:안에|이내|내))?(?=\s|$)|[0-9]{1,2}시간\s*(?:안에|이내|내)|(?:새벽|아침|점심|오전|오후|저녁|밤)\s*[0-9]{1,2}시|[0-9]{1,2}시|[0-9]{1,2}:[0-9]{2}|마감|기한|데드라인)/u;

export function parseKoreanScheduleBatch(input: string, options: ParseOptions = {}): ParseBatchResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      items: [],
      errors: [],
      isBatch: false,
      tooManyItems: false,
    };
  }

  const parts = splitIntoParts(trimmed);
  const tooManyItems = parts.length > MAX_BATCH_ITEMS;
  const limitedParts = parts.slice(0, MAX_BATCH_ITEMS);
  const items: ParsedBatchItem[] = [];
  const errors: ParsedBatchError[] = [];
  let anchorDateCue: string | undefined;

  for (let index = 0; index < limitedParts.length; index += 1) {
    const part = limitedParts[index];
    const direct = parseKoreanSchedule(part, options);
    if (direct.ok) {
      items.push({
        input: part,
        value: {
          ...direct.value,
          source: part,
        },
        inheritedDate: false,
      });
      if (!anchorDateCue) {
        anchorDateCue = buildDateCue(direct.value.start);
      }
      continue;
    }

    if (index > 0 && anchorDateCue) {
      const inheritedInput = `${anchorDateCue} ${part}`;
      const inherited = parseKoreanSchedule(inheritedInput, options);
      if (inherited.ok) {
        items.push({
          input: part,
          value: {
            ...inherited.value,
            source: part,
          },
          inheritedDate: true,
        });
        continue;
      }
    }

    errors.push({
      input: part,
      error: direct.error,
    });
  }

  return {
    items,
    errors,
    isBatch: parts.length > 1,
    tooManyItems,
  };
}

export function parseKoreanScheduleBatchWithRetrySnapshot(
  input: string,
  retrySnapshot: BatchRetrySnapshot | undefined,
  options: ParseOptions = {},
): ParseBatchResult {
  const parsed = parseKoreanScheduleBatch(input, options);
  if (!retrySnapshot || parsed.items.length === 0) {
    return parsed;
  }

  const snapshotItemsByInput = new Map<string, ParsedBatchItem[]>();
  for (const item of retrySnapshot.batch.items) {
    const key = normalizeRetryInput(item.input);
    const matches = snapshotItemsByInput.get(key) ?? [];
    matches.push(item);
    snapshotItemsByInput.set(key, matches);
  }

  return {
    ...parsed,
    items: parsed.items.map((item) => {
      const key = normalizeRetryInput(item.input);
      const snapshotItem = snapshotItemsByInput.get(key)?.shift();
      if (!snapshotItem) {
        return item;
      }
      return {
        ...snapshotItem,
        input: item.input,
        value: {
          ...snapshotItem.value,
          source: item.input,
        },
      };
    }),
  };
}

function splitIntoParts(input: string): string[] {
  const parts: string[] = [];
  let cursor = 0;

  for (const match of input.matchAll(BATCH_TOKEN_PATTERN)) {
    const index = match.index;
    if (index === undefined) {
      continue;
    }

    const token = match[1];
    const separatorEnd = index + match[0].length;
    if (!shouldSplitByToken(token, input.slice(separatorEnd))) {
      continue;
    }

    const nextPart = input.slice(cursor, index).trim();
    if (nextPart) {
      parts.push(nextPart);
    }
    cursor = separatorEnd;
  }

  const tail = input.slice(cursor).trim();
  if (tail) {
    parts.push(tail);
  }

  return parts;
}

function shouldSplitByToken(token: string, remainingText: string): boolean {
  if (token !== "," && token !== ";" && token !== "그리고" && token !== "하고") {
    return false;
  }

  return DATE_TIME_CUE_AT_START_PATTERN.test(remainingText.trimStart());
}

function buildDateCue(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function firstBatchParseResult(batch: ParseBatchResult): ParseResult | null {
  const first = batch.items[0];
  if (first) {
    return { ok: true, value: first.value };
  }
  const firstError = batch.errors[0];
  if (firstError) {
    return { ok: false, error: firstError.error };
  }
  return null;
}

export function buildBatchRetryInput(item: ParsedBatchItem): string {
  if (item.value.recurrence) {
    // The retry snapshot retains the resolved first occurrence while keeping recurrence text editable.
    return item.input;
  }

  const { value } = item;
  const date = buildDateCue(value.start);
  const location = value.location ? ` 장소: ${value.location}` : "";

  if (value.allDay) {
    const deadlineSuffix = value.intent === "deadline" ? "까지" : "";
    return `${date}${deadlineSuffix} ${value.title}${location}`;
  }

  const startTime = buildTimeCue(value.start);
  const timeCue = value.intent === "deadline" ? `${startTime}까지` : `${startTime}부터 ${buildTimeCue(value.end)}까지`;
  return `${date} ${timeCue} ${value.title}${location}`;
}

export function buildBatchRetrySnapshot(items: ParsedBatchItem[]): BatchRetrySnapshot {
  const retryItems = items.map((item) => {
    const input = buildBatchRetryInput(item);
    return {
      input,
      value: {
        ...item.value,
        source: input,
      },
      inheritedDate: false,
    };
  });

  return {
    sentence: retryItems.map((item) => item.input).join(", "),
    batch: {
      items: retryItems,
      errors: [],
      isBatch: retryItems.length > 1,
      tooManyItems: false,
    },
  };
}

function buildTimeCue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function normalizeRetryInput(input: string): string {
  return input.trim().replace(/\s+/gu, " ");
}
