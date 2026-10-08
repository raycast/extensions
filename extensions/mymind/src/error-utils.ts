type ProblemLike =
  | {
      detail?: string;
      type?: string;
    }
  | null
  | undefined;

const READ_ONLY_HINT_PATTERNS = [/read[- ]only/i, /full[- ]access/i, /access level/i];

export function isReadOnlyAccessProblem(problem: ProblemLike): boolean {
  const detail = problem?.detail?.trim();
  const type = problem?.type?.trim();

  return [detail, type].some((value) => value && READ_ONLY_HINT_PATTERNS.some((pattern) => pattern.test(value)));
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    return message || fallback;
  }

  if (typeof error === "string") {
    const message = error.trim();
    return message || fallback;
  }

  return fallback;
}

export function getErrorEmptyView(error: unknown, title: string, fallbackDescription = "Try again in a moment.") {
  const description = getErrorMessage(error, fallbackDescription);

  return {
    title,
    description: description === title ? fallbackDescription : description,
  };
}

export function getBatchUploadFailureMessage(input: {
  createdCount: number;
  duplicateCount: number;
  failureCount: number;
  firstFailureMessage?: string;
}): string {
  const parts: string[] = [];

  if (input.createdCount > 0) {
    parts.push(`${input.createdCount} uploaded`);
  }

  if (input.duplicateCount > 0) {
    parts.push(`${input.duplicateCount} already existed`);
  }

  if (input.failureCount > 0) {
    parts.push(`${input.failureCount} failed`);
  }

  const summary = parts.join(", ");

  if (input.firstFailureMessage) {
    return summary ? `${summary}. ${input.firstFailureMessage}` : input.firstFailureMessage;
  }

  return summary || "Upload failed.";
}
