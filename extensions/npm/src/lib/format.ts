export function normalizeExternalUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  return url.replace(/^git\+/, "").replace(/\.git$/, "");
}

export function formatDate(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}

export function formatScore(value?: number): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return `${Math.round(value * 100)}%`;
}

export function formatKeywords(keywords: string[]): string | undefined {
  if (keywords.length === 0) {
    return undefined;
  }

  return keywords.join(", ");
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return "Something went wrong.";
}
