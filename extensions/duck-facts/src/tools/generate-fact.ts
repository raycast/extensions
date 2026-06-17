import { AI } from "@raycast/api";

type FactLength = "short" | "medium" | "long";

interface LengthGuide {
  [key: string]: string;
}

type Input = {
  /**
   * The specific type of duck to get a fact about. If not provided, will generate a fact about any duck.
   * Must be related to ducks - other animal or topic requests will be rejected.
   */
  duckType?: string;

  /**
   * The specific aspect of ducks to focus on (e.g., 'behavior', 'habitat', 'diet', 'anatomy', 'breeding').
   * Helps generate more targeted facts about particular duck characteristics.
   */
  aspect?: string;

  /**
   * The preferred length of the fact ('short', 'medium', 'long').
   * Default is 'medium' if not specified.
   */
  length?: FactLength;

  /**
   * Whether to include scientific terminology in the fact.
   * Default is false.
   */
  includeScientific?: boolean;
};

const LENGTH_GUIDES: LengthGuide = {
  short: "Keep it brief, around 1-2 sentences",
  medium: "Use 2-3 sentences",
  long: "Provide a detailed explanation in 3-4 or more sentences",
} as const;

const DEFAULT_LENGTH: FactLength = "medium";

/**
 * Builds the prompt for the AI based on the provided input parameters
 */
function buildPrompt(input: Input): string {
  const baseFact = input.duckType
    ? `Generate an interesting and educational fact specifically about ${input.duckType}`
    : "Generate an interesting and educational fact about ducks";

  const aspectClause = input.aspect ? `, focusing on their ${input.aspect}` : "";
  const lengthGuide = LENGTH_GUIDES[input.length || DEFAULT_LENGTH];
  const scientificClause = input.includeScientific
    ? ". Include relevant scientific terminology and Latin names where appropriate"
    : "";

  return `${baseFact}${aspectClause}. ${lengthGuide}${scientificClause}. The fact must be about ducks and should be accurate and engaging. If the query is not about ducks, respond that you can only provide facts about ducks.`;
}

/**
 * Generates an interesting fact about ducks using AI. If a specific duck type is provided,
 * the fact will be about that type of duck. Only responds to duck-related queries.
 */
export default async function generateFact(input: Input) {
  const prompt = buildPrompt(input);
  const response = await AI.ask(prompt);
  return { fact: response };
}
