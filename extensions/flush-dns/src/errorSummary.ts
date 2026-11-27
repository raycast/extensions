const FALLBACK_MESSAGE = "Error flushing DNS cache";
const MAX_HUD_LENGTH = 64;

function nonEmptyLines(output: unknown): string[] {
  return String(output ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getErrorSummary(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return FALLBACK_MESSAGE;
  }

  // Command-line tools such as ipconfig print their errors on stdout, after a header.
  const stderrLines = "stderr" in error ? nonEmptyLines(error.stderr) : [];
  const stdoutLines = "stdout" in error ? nonEmptyLines(error.stdout) : [];
  const messageLines = "message" in error ? nonEmptyLines(error.message) : [];

  return stderrLines[0] ?? stdoutLines[stdoutLines.length - 1] ?? messageLines[0] ?? FALLBACK_MESSAGE;
}

export function formatErrorHud(error: unknown): string {
  const hud = `⚠️ ${getErrorSummary(error)}`;
  return hud.length > MAX_HUD_LENGTH ? `${hud.substring(0, MAX_HUD_LENGTH - 1)}…` : hud;
}
