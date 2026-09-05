import { createXaiAdapter } from "../adapters/xai";
import { createProvider } from "../factories/provider";

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
  createXaiAdapter,
);
