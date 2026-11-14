import firecrawl from "../firecrawl";

export type Input = {
  /** The search query string to research */
  query: string;
};

export default async function (input: Input) {
  const { query } = input;

  // Deep Research was retired in favor of the Agent API: https://docs.firecrawl.dev/migrating-from-deep-research
  const research = await firecrawl.agent({
    prompt: query,
    schema: {
      type: "object",
      properties: {
        report: {
          type: "string",
          description: "A markdown report that answers the question, citing its sources as markdown links",
        },
      },
      required: ["report"],
    },
    integration: "raycast",
  });

  if (research.status !== "completed") {
    throw new Error(research.error ?? "Failed to perform deep research");
  }

  return { finalAnalysis: (research.data as { report: string }).report };
}
