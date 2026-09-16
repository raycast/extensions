import { createBetterStackAdapter } from "../adapters/betterstack";
import { createProvider } from "../factories/provider";

export const togetherProvider = createProvider(
  {
    id: "together-ai",
    name: "Together AI",
    aliases: ["Together", "Together API", "Together Inference"],
    category: "routers-and-inference",
    preferenceKey: "showTogetherAI",
    icon: "provider-icons/together.png",
    statusPageUrl: "https://status.together.ai/",
  },
  createBetterStackAdapter,
);
