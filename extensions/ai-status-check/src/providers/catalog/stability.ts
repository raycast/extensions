import { createIncidentIoAdapter } from "../adapters/incidentio";
import { createProvider } from "../factories/provider";

export const stabilityProvider = createProvider(
  {
    id: "stability-ai",
    name: "Stability AI",
    aliases: ["Stable Diffusion", "Stability API"],
    category: "specialized",
    preferenceKey: "showStabilityAI",
    icon: "provider-icons/stability.png",
    statusPageUrl: "https://status.stability.ai/",
  },
  createIncidentIoAdapter,
);
