import { createMistralAdapter } from "../adapters/mistral";
import { createProvider } from "../factories/provider";

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
  createMistralAdapter,
);
