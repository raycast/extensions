export function logError(error: unknown): void {
  if (isExpectedError(error)) {
    console.warn(error);
  } else {
    console.error(error);
  }
}

function isExpectedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /ETIMEDOUT|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENOTFOUND/.test(message) ||
    /Connection timed out/.test(message) ||
    /\bStatus (code: )?(429|503)\b/.test(message) ||
    // Bridge returns non-JSON responses during firmware updates, causing a SyntaxError on JSON.parse
    /\binit_ota\b/.test(message)
  );
}
