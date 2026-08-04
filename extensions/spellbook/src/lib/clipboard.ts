const MAX_PREFILL_LENGTH = 500;
const MAX_PREFILL_LINES = 3;

export function looksLikeShellCommand(
  text: string | undefined,
): text is string {
  if (text === undefined) {
    return false;
  }
  const trimmed = text.trim();
  if (trimmed === "" || trimmed.length > MAX_PREFILL_LENGTH) {
    return false;
  }
  if (trimmed.split("\n").length > MAX_PREFILL_LINES) {
    return false;
  }
  return /^[A-Za-z0-9_./~]/.test(trimmed);
}
