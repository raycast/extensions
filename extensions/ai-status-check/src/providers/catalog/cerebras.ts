import { createStatuspageAdapter } from "../adapters/statuspage";
import { createProvider } from "../factories/provider";

export const cerebrasProvider = createProvider(
  {
    id: "cerebras",
    name: "Cerebras",
    aliases: ["Cerebras Inference", "Cerebras API"],
    category: "routers-and-inference",
    preferenceKey: "showCerebras",
    icon: "provider-icons/cerebras.png",
    statusPageUrl: "https://status.cerebras.ai/",
  },
  createStatuspageAdapter,
);
