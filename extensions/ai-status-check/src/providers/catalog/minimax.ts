import { createStatuspageAdapter } from "../adapters/statuspage";
import { createProvider } from "../factories/provider";

export const minimaxProvider = createProvider(
  {
    id: "minimax",
    name: "MiniMax",
    aliases: ["MiniMax API", "MiniMax LLM", "MiniMax Audio", "MiniMax Video"],
    category: "model-providers",
    preferenceKey: "showMiniMax",
    icon: "provider-icons/minimax.png",
    statusPageUrl: "https://status.minimax.io/",
  },
  createStatuspageAdapter,
);
