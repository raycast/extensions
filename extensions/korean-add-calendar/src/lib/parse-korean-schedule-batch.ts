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

export const MAX_BATCH_ITEMS = 3;
const BATCH_TOKEN_PATTERN = /\s*(,|;|그리고|하고)\s*/gu;
const DATE_TIME_CUE_AT_START_PATTERN =
  /^(?:오늘|내일|모레|이번주|다음주|담주|다담주|다다음주|이번달|이달|다음달|담달|매\s*(?:일|주|월)|[월화수목금토일](?:요일|욜)|[0-9]{1,2}월\s*[0-9]{1,2}일|[0-9]{1,2}일\s*(?:안에|이내|내)|[0-9]{1,2}시간\s*(?:안에|이내|내)|(?:새벽|아침|점심|오전|오후|저녁|밤)\s*[0-9]{1,2}시|[0-9]{1,2}시|[0-9]{1,2}:[0-9]{2}|마감|기한|데드라인)/u;

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
  if (token === "," || token === ";") {
    return true;
  }

  if (token !== "그리고" && token !== "하고") {
    return false;
  }

  return DATE_TIME_CUE_AT_START_PATTERN.test(remainingText.trimStart());
}

function buildDateCue(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
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
