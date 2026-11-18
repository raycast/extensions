/**
 * Readable message for an error, including its `cause`.
 *
 * Node's fetch throws a bare "TypeError: fetch failed" for network problems and
 * hides the reason (DNS, refused connection, TLS certificate, ...) in `cause`.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = error.cause as { code?: string; message?: string } | undefined;
  const reason = cause?.code ?? cause?.message;
  return reason ? `${error.message} (${reason})` : error.message;
}
