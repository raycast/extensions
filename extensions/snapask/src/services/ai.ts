import { HumanMessage } from "@langchain/core/messages";
import { getPreferenceValues } from "@raycast/api";
import { ChatOpenAI, ChatOpenAIFields } from "@langchain/openai";

function determineBaseURL(url: string | undefined): string | undefined {
  if (!url || url.trim() === "") return undefined;

  const trimmedURL = url.trim().toLowerCase();
  const defaultDomains = ["openai.com", "api.openai.com"];

  for (const domain of defaultDomains) {
    if (trimmedURL.includes(domain)) return undefined;
  }

  return url.trim();
}

export async function ask(query: string) {
  const { model, apiKey, baseURL } = getPreferenceValues<Preferences>();

  const url = determineBaseURL(baseURL);

  const config: ChatOpenAIFields = {
    model: model,
    configuration: {
      baseURL: url,
      apiKey: apiKey,
    },
  };

  const llm = new ChatOpenAI(config);

  return await llm.invoke([new HumanMessage({ content: query })]);
}
