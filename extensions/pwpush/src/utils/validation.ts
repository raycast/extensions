export function validatePositiveInteger(value: string | undefined, fallback: number): number | null {
  const raw = value?.trim() || String(fallback);

  if (!/^[1-9]\d*$/.test(raw)) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isSafeInteger(parsed)) {
    return null;
  }

  return parsed;
}

export function validateDurationIndex(value: string | undefined, fallback: number): number | null {
  const raw = value?.trim() || String(fallback);

  if (!/^\d+$/.test(raw)) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 17) {
    return null;
  }

  return parsed;
}

export function validateOptionalUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
