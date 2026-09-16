import { createIncidentIoAdapter } from "../adapters/incidentio";
import { createProvider } from "../factories/provider";

export const elevenLabsProvider = createProvider(
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    aliases: ["Eleven Labs", "Text to Speech", "Speech to Text"],
    category: "specialized",
    preferenceKey: "showElevenLabs",
    icon: "provider-icons/elevenlabs.png",
    statusPageUrl: "https://status.elevenlabs.io/",
  },
  createIncidentIoAdapter,
);
