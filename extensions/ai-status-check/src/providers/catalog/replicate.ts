import { createIncidentIoAdapter } from "../adapters/incidentio";
import { createProvider } from "../factories/provider";

export const replicateProvider = createProvider(
  {
    id: "replicate",
    name: "Replicate",
    aliases: ["Replicate API", "r8.im"],
    category: "routers-and-inference",
    preferenceKey: "showReplicate",
    icon: "provider-icons/replicate.png",
    statusPageUrl: "https://www.replicatestatus.com/",
  },
  createIncidentIoAdapter,
);
