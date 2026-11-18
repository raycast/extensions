import { getReport, normalizeUrl, reportSummary } from "../lib/is-agentic";

type Input = {
  /** The public website URL to inspect, such as https://example.com. */
  url: string;
};

/**
 * Gets the latest completed Is Agentic report for one public website. Use this to answer questions about
 * agent readiness, score breakdowns, failed checks, evidence, or recommended improvements. This tool never starts a scan.
 */
export default async function getAgentReadiness(input: Input) {
  const report = await getReport(normalizeUrl(input.url));
  return reportSummary(report);
}
