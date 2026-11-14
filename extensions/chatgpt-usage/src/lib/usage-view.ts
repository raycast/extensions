import { formatProgressBar, formatReset, resetPassed, UsageSnapshot } from "./usage";

export function usageMarkdown(
  data: UsageSnapshot | undefined,
  error?: string,
  stale = false,
  now = Date.now(),
): string {
  if (!data) {
    return error
      ? `# Usage unavailable\n\n${error}\n\nUse **Refresh Usage** to try again, or open extension preferences to check your Codex path.`
      : "# Plan limits\n\nLoading your shared ChatGPT allowance…";
  }

  const sections = data.windows.map((window) => {
    if (resetPassed(window, now)) {
      return `## ${window.label}\n\n**Awaiting refresh**\n\nReset time has passed. Refresh to confirm your new allowance.`;
    }
    return [
      `## ${window.label}`,
      `### ${window.remainingPercent}% left`,
      `\`${formatProgressBar(window.remainingPercent, 20)}\``,
      formatReset(window.resetsAt, now),
    ].join("\n\n");
  });
  return [
    "# Plan limits",
    ...(stale ? [`> **Last known usage.** ${error ?? "Refresh to get the latest reading."}`] : []),
    sections.length ? sections.join("\n\n---\n\n") : "No fixed plan limits are reported for this account.",
    "---",
    "Shared across **Codex, Work, Workspace Agents, and ChatGPT for Excel**. Chat conversations aren't included.",
  ].join("\n\n");
}
