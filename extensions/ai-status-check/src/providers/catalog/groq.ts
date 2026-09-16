import { createIncidentIoAdapter } from "../adapters/incidentio";
import { createProvider } from "../factories/provider";

export const groqProvider = createProvider(
  {
    id: "groq",
    name: "Groq",
    aliases: ["GroqCloud", "Groq API"],
    category: "routers-and-inference",
    preferenceKey: "showGroq",
    icon: "provider-icons/groq.png",
    statusPageUrl: "https://groqstatus.com/",
  },
  createIncidentIoAdapter,
);
