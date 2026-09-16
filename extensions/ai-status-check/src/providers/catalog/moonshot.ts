import { createStatuspageAdapter } from "../adapters/statuspage";
import { createProvider } from "../factories/provider";

export const moonshotProvider = createProvider(
  {
    id: "moonshot-ai",
    name: "Moonshot AI",
    aliases: ["Kimi", "Kimi API", "Moonshot API"],
    category: "model-providers",
    preferenceKey: "showMoonshotAI",
    icon: "provider-icons/moonshot.png",
    statusPageUrl: "https://status.moonshot.cn/",
  },
  createStatuspageAdapter,
);
