import { getReport, normalizeUrl, reportSummary } from "../lib/is-agentic";

type Input = {
  /** The first public website URL to compare, such as https://example.com. */
  firstUrl: string;
  /** The second public website URL to compare, such as https://example.org. */
  secondUrl: string;
};

/**
 * Compares the latest completed Is Agentic reports for two public websites. Use this when the user asks which
 * site is more ready for AI agents or wants a side-by-side breakdown. This tool never starts a scan.
 */
export default async function compareAgentReadiness(input: Input) {
  const [first, second] = await Promise.all([
    getReport(normalizeUrl(input.firstUrl)),
    getReport(normalizeUrl(input.secondUrl)),
  ]);
  const firstScore = first.score ?? 0;
  const secondScore = second.score ?? 0;

  return {
    first: reportSummary(first),
    second: reportSummary(second),
    comparison: {
      higherScore: firstScore === secondScore ? "tie" : firstScore > secondScore ? "first" : "second",
      scoreDifference: Math.abs(firstScore - secondScore),
      issueCountDifference: first.issues.length - second.issues.length,
    },
  };
}
