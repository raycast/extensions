import { createOpenRouterAdapter } from "../adapters/openrouter";
import { createProvider } from "../factories/provider";

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
  createOpenRouterAdapter,
);
