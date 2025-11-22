import firecrawl from "../firecrawl";
import { getPreferenceValues } from "@raycast/api";

export type Input = {
  /** The search query string to research */
  query: string;
};

export default async function (input: Input) {
  const { query } = input;

  // // Start deep research
  const research = await firecrawl.v1.__deepResearch(query, {
    // (BUG): Bigger max depth, takes more time, and tool stall - pinged @thomas about it
    maxDepth: parseInt(getPreferenceValues().maxDepth ?? "3"),
    timeLimit: parseInt(getPreferenceValues().timeLimit ?? "500"),
    // @ts-expect-error integration property is not defined in DeepResearchParams type
    integration: "raycast",
  });

  if (!research.success) {
    throw new Error(research.error ?? "Failed to perform deep research");
  }

  return { finalAnalysis: research.data.finalAnalysis };
}
