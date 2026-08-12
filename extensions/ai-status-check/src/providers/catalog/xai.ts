import { createHtmlRssAdapter } from "../adapters/html-rss";
import { createProvider } from "../factories/provider";
import { parseXaiStatusPage } from "../parsers/xai";

export const xaiProvider = createProvider(
  {
    id: "xai",
    name: "xAI",
    aliases: ["Grok", "xAI API", "Grok API", "Grok Web"],
    category: "model-providers",
    preferenceKey: "showXAI",
    icon: "provider-icons/xai.png",
    statusPageUrl: "https://status.x.ai/",
  },
  createHtmlRssAdapter,
  {
    pageUrl: "https://status.x.ai/index.txt",
    feedUrl: "https://status.x.ai/feed.xml",
    parsePage: parseXaiStatusPage,
  },
);
