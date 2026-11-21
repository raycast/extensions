import { getReport, normalizeUrl, reportSummary } from "../lib/is-agentic";

type Input = {
  /** The first public website URL to compare, such as https://example.com. */
  firstUrl: string;
  /** The second public website URL to compare, such as https://example.org. */
  secondUrl: string;
};

function compareScores(firstScore: number | null, secondScore: number | null) {
  if (firstScore === null || secondScore === null) {
    return { scoreComparisonAvailable: false, higherScore: null, scoreDifference: null };
  }

  return {
    scoreComparisonAvailable: true,
    higherScore: firstScore === secondScore ? "tie" : firstScore > secondScore ? "first" : "second",
    scoreDifference: Math.abs(firstScore - secondScore),
  };
}

/**
 * Compares the latest completed Is Agentic reports for two public websites. Use this when the user asks which
 * site is more ready for AI agents or wants a side-by-side breakdown. This tool never starts a scan.
 */
export default async function compareAgentReadiness(input: Input) {
  const [first, second] = await Promise.all([
    getReport(normalizeUrl(input.firstUrl)),
    getReport(normalizeUrl(input.secondUrl)),
  ]);
  return {
    first: reportSummary(first),
    second: reportSummary(second),
    comparison: {
      ...compareScores(first.score, second.score),
      issueCountDifference: first.issues.length - second.issues.length,
    },
  };
}
