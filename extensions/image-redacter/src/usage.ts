export type UsageRecord = { day: string; files: string[] };

export type UsageClaim = {
  allowed: boolean;
  remaining: number;
  record: UsageRecord;
};

export function localDay(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function remainingRedactions(
  record: UsageRecord | undefined,
  day: string,
  limit: number,
): number {
  return Math.max(0, limit - filesForDay(record, day).length);
}

/**
 * Spends one free redaction on a file, unless that file was already opened
 * today. Reopening the same file is free so that closing the browser tab by
 * accident does not cost the user a redaction.
 */
export function claimRedaction(
  record: UsageRecord | undefined,
  fileId: string,
  day: string,
  limit: number,
): UsageClaim {
  const files = filesForDay(record, day);
  if (files.includes(fileId)) {
    return {
      allowed: true,
      remaining: Math.max(0, limit - files.length),
      record: { day, files },
    };
  }
  if (files.length >= limit) {
    return { allowed: false, remaining: 0, record: { day, files } };
  }
  const next = [...files, fileId];
  return {
    allowed: true,
    remaining: limit - next.length,
    record: { day, files: next },
  };
}

function filesForDay(record: UsageRecord | undefined, day: string): string[] {
  return record?.day === day ? record.files : [];
}
