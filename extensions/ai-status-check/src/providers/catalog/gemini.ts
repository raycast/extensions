import { createGeminiAdapter } from "../adapters/gemini";
import { createProvider } from "../factories/provider";

export const geminiProvider = createProvider(
  {
    id: "gemini-api",
    name: "Google AI Studio and Gemini",
    aliases: ["Gemini", "Google AI Studio", "Google AI", "Multimodal Live API"],
    category: "model-providers",
    preferenceKey: "showGemini",
    icon: "provider-icons/gemini.png",
    statusPageUrl: "https://aistudio.google.com/status",
  },
  createGeminiAdapter,
);
