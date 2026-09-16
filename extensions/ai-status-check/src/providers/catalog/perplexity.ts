import { createIncidentIoAdapter } from "../adapters/incidentio";
import { createProvider } from "../factories/provider";

export const perplexityProvider = createProvider(
  {
    id: "perplexity",
    name: "Perplexity",
    aliases: ["Perplexity AI", "Perplexity API", "Sonar"],
    category: "model-providers",
    preferenceKey: "showPerplexity",
    icon: "provider-icons/perplexity.png",
    statusPageUrl: "https://status.perplexity.com/",
  },
  createIncidentIoAdapter,
);
