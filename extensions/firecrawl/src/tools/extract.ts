import firecrawl from "../firecrawl";

export type Input = {
  /** The URL to extract from */
  urls: string[];
  /** The prompt to use for the extraction */
  userPrompt: string;
};

export default async function (input: Input) {
  const { urls, userPrompt } = input;

  const extractResult = await firecrawl.extract({
    urls,
    prompt: userPrompt ?? "Extract the main content from the webpage",
    integration: "raycast",
  });

  if (!extractResult.success) {
    throw new Error(extractResult.error ?? "Failed to extract content from the webpage");
  }

  return {
    data: extractResult.data,
  };
}
