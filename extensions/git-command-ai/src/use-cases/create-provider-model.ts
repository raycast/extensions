import { ChatOpenAI } from "@langchain/openai";
import { Provider } from "../types";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";

const models = {
  [Provider.OPENAI]: "gpt-4o-mini",
  [Provider.ANTHROPIC]: "claude-3-5-sonnet-latest",
  [Provider.GEMINI]: "gemini-2.0-flash",
};

export const outputSchema = z.object({
  command: z.string().describe("The git command to run"),
  description: z.string().describe("A description of the command"),
});

export type OutputSchema = z.infer<typeof outputSchema>;

export function createProviderModel(provider: Provider, apiKey: string) {
  const model = models[provider];

  switch (provider) {
    case Provider.OPENAI:
      return new ChatOpenAI({
        apiKey,
        model,
      }).withStructuredOutput(outputSchema);

    case Provider.ANTHROPIC:
      return new ChatAnthropic({
        apiKey,
        model,
      }).withStructuredOutput(outputSchema);

    case Provider.GEMINI:
      return new ChatGoogleGenerativeAI({
        apiKey,
        model,
      }).withStructuredOutput(outputSchema);

    default:
      throw new Error(`Provider ${provider} not supported`);
  }
}
