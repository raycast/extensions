import { createHtmlRssAdapter } from "../adapters/html-rss";
import { createProvider } from "../factories/provider";
import { parseOnlineOrNotStatusPage } from "../parsers/rendered-status";

export const openRouterProvider = createProvider(
  {
    id: "openrouter",
    name: "OpenRouter",
    aliases: ["OpenRouter API", "Model Router"],
    category: "routers-and-inference",
    preferenceKey: "showOpenRouter",
    icon: "provider-icons/openrouter.png",
    statusPageUrl: "https://status.openrouter.ai/",
  },
  createHtmlRssAdapter,
  {
    feedUrl: "https://status.openrouter.ai/incidents.rss",
    parsePage: parseOnlineOrNotStatusPage,
  },
);
