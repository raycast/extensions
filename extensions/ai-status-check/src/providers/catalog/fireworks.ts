import { createIncidentIoAdapter } from "../adapters/incidentio";
import { createProvider } from "../factories/provider";

export const fireworksProvider = createProvider(
  {
    id: "fireworks-ai",
    name: "Fireworks AI",
    aliases: ["Fireworks", "Fireworks API"],
    category: "routers-and-inference",
    preferenceKey: "showFireworksAI",
    icon: "provider-icons/fireworks.png",
    statusPageUrl: "https://status.fireworks.ai/",
  },
  createIncidentIoAdapter,
);
