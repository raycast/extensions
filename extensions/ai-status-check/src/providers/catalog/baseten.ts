import { createStatuspageAdapter } from "../adapters/statuspage";
import { createProvider } from "../factories/provider";

export const basetenProvider = createProvider(
  {
    id: "baseten",
    name: "Baseten",
    aliases: ["Baseten Inference", "Model APIs"],
    category: "routers-and-inference",
    preferenceKey: "showBaseten",
    icon: "provider-icons/baseten.png",
    statusPageUrl: "https://status.baseten.co/",
  },
  createStatuspageAdapter,
);
