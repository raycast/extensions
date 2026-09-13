import { createIncidentIoAdapter } from "../adapters/incidentio";
import { createProvider } from "../factories/provider";

export const cohereProvider = createProvider(
  {
    id: "cohere",
    name: "Cohere",
    aliases: ["Command", "Embed", "Rerank"],
    category: "model-providers",
    preferenceKey: "showCohere",
    icon: "provider-icons/cohere.png",
    statusPageUrl: "https://status.cohere.com/",
  },
  createIncidentIoAdapter,
);
