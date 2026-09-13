import { createFlashcatAdapter } from "../adapters/flashcat";
import { createProvider } from "../factories/provider";

export const deepseekProvider = createProvider(
  {
    id: "deepseek",
    name: "DeepSeek",
    aliases: ["DeepSeek API", "DeepSeek Chat"],
    category: "model-providers",
    preferenceKey: "showDeepSeek",
    icon: "provider-icons/deepseek.png",
    statusPageUrl: "https://status.deepseek.com/",
  },
  createFlashcatAdapter,
  {
    pageId: "6410630422455",
  },
);
