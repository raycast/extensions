import { formatTokens, lastDays, loadClaudeTokens, RESCAN_HINT, usageForDays } from "../lib/tokens";

type Input = {
  /** How many days back from today, as a number from 1 to 90, e.g. "7". Defaults to "7". */
  days?: string;
};

/**
 * Claude Code's tokens per day and per project, from Lancetta's scan of the local transcripts
 * (input + output + cache writes; cache reads are left out). Codex's tokens are not available
 * here: they live in Codex's account and show only in Lancetta's window.
 */
export default async function tool(input: Input) {
  const count = Number(input.days ?? "7");
  if (!Number.isInteger(count) || count < 1 || count > 90) {
    throw new Error(`"days" is a whole number from 1 to 90, not "${input.days}".`);
  }
  const usage = await loadClaudeTokens();
  const { perDay, total, projects } = usageForDays(usage, lastDays(count));
  return {
    agent: "Claude Code",
    counted: "input + output + cache-creation tokens; cache reads excluded",
    // Lancetta rescans only when its Usage view loads: today is counted up to this moment
    asOf: usage.asOf ? new Date(usage.asOf * 1000).toISOString() : null,
    freshness: usage.asOf
      ? `Counted up to ${new Date(usage.asOf * 1000).toLocaleString()}. ${RESCAN_HINT}`
      : `Lancetta has not scanned Claude Code's transcripts yet. ${RESCAN_HINT}`,
    total: formatTokens(total),
    totalExact: total,
    perDay: perDay.map((d) => ({ day: d.day, tokens: d.tokens, readable: formatTokens(d.tokens) })),
    topProjects: projects
      .slice(0, 10)
      .map((p) => ({ project: p.project, tokens: p.tokens, readable: formatTokens(p.tokens) })),
    codex:
      "Not available from this extension: Codex's daily tokens come from its account, shown in Lancetta's Usage pane.",
  };
}
