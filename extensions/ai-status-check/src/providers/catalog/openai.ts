import { createIncidentIoAdapter } from "../adapters/incidentio";
import { createProvider } from "../factories/provider";

export const openaiProvider = createProvider(
  {
    id: "openai",
    name: "OpenAI",
    aliases: ["ChatGPT", "Codex", "GPT", "Sora"],
    category: "model-providers",
    preferenceKey: "showOpenAI",
    icon: "provider-icons/openai.png",
    statusPageUrl: "https://status.openai.com/",
  },
  createIncidentIoAdapter,
);
