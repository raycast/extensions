import { createBetterStackAdapter } from "../adapters/betterstack";
import { createProvider } from "../factories/provider";

export const huggingFaceProvider = createProvider(
  {
    id: "hugging-face",
    name: "Hugging Face",
    aliases: ["HuggingFace", "HF", "Inference Endpoints", "Spaces"],
    category: "routers-and-inference",
    preferenceKey: "showHuggingFace",
    icon: "provider-icons/huggingface.png",
    statusPageUrl: "https://status.huggingface.co/",
  },
  createBetterStackAdapter,
);
