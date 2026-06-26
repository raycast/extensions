export function getRateLimitErrorMessage(retryAfter: string | null): string {
  const baseMessage = "Jira rate limit reached. Please wait a bit and try again.";
  if (!retryAfter) {
    return baseMessage;
  }

  const retryAfterSeconds = parseRetryAfter(retryAfter);
  if (retryAfterSeconds === null) {
    return baseMessage;
  }

  return `Jira rate limit reached. Please try again in ${formatRetryAfterDuration(retryAfterSeconds)}.`;
}

function parseRetryAfter(retryAfter: string): number | null {
  const normalizedRetryAfter = retryAfter.trim();
  if (!normalizedRetryAfter) {
    return null;
  }

  const seconds = Number(normalizedRetryAfter);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return Math.ceil(seconds);
  }

  const retryDate = Date.parse(normalizedRetryAfter);
  if (!Number.isNaN(retryDate)) {
    const deltaSeconds = Math.ceil((retryDate - Date.now()) / 1000);
    return deltaSeconds > 0 ? deltaSeconds : null;
  }

  return null;
}

function formatRetryAfterDuration(seconds: number): string {
  if (seconds < 60) {
    return seconds === 1 ? "1 second" : `${seconds} seconds`;
  }

  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    try {
      const parsedError = JSON.parse(error.message);
      if (parsedError.errorMessages && Array.isArray(parsedError.errorMessages)) {
        return parsedError.errorMessages[0];
      }
    } catch {
      return error.message;
    }
  }

  return String(error);
}
