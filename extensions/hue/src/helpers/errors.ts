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
    /Connection timed out|aborted due to timeout|closed with error code/.test(message) ||
    /Lost connection to Hue Bridge|Hue Bridge is busy/.test(message) ||
    /\bStatus (429|503)\b/.test(message) ||
    // Bridge returns non-JSON responses during firmware updates, causing a SyntaxError on JSON.parse
    /\binit_ota\b/.test(message) ||
    // fetch rejects with "fetch failed" and puts the network error in cause
    (error instanceof Error && "cause" in error && isExpectedError(error.cause))
  );
}
