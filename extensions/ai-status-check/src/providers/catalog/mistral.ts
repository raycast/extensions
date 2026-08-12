import { createHtmlRssAdapter } from "../adapters/html-rss";
import { createProvider } from "../factories/provider";
import { parseMistralStatusPage } from "../parsers/rendered-status";

export const mistralProvider = createProvider(
  {
    id: "mistral-ai",
    name: "Mistral AI",
    aliases: ["Mistral", "Le Chat", "La Plateforme", "Codestral"],
    category: "model-providers",
    preferenceKey: "showMistral",
    icon: "provider-icons/mistral.png",
    statusPageUrl: "https://status.mistral.ai/",
  },
  createHtmlRssAdapter,
  {
    feedUrl: "https://status.mistral.ai/feed.rss",
    parsePage: parseMistralStatusPage,
  },
);
