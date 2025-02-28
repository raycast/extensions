import { Service } from "./types";

// Service list configuration
export const services: Service[] = [
  {
    name: "Raycast",
    apiUrl: "N/A",
    statusPageUrl: "https://status.raycast.com/",
  },
  {
    name: "OpenAI",
    apiUrl: "https://status.openai.com/api/v2/status.json",
    statusPageUrl: "https://status.openai.com/",
  },
  {
    name: "Anthropic",
    apiUrl: "https://status.anthropic.com/api/v2/status.json",
    statusPageUrl: "https://status.anthropic.com/",
  },
  {
    name: "DeepSeek",
    apiUrl: "https://status.deepseek.com/api/v2/status.json",
    statusPageUrl: "https://status.deepseek.com/",
  },
  {
    name: "Supabase",
    apiUrl: "https://status.supabase.com/api/v2/status.json",
    statusPageUrl: "https://status.supabase.com/",
  },
  {
    name: "Vercel",
    apiUrl: "https://www.vercel-status.com/api/v2/status.json",
    statusPageUrl: "https://www.vercel-status.com/",
  },
  {
    name: "Gemini",
    apiUrl: "N/A",
    statusPageUrl: "https://www.google.com/appsstatus/dashboard/",
  },
  {
    name: "Azure",
    apiUrl: "N/A",
    statusPageUrl: "https://status.azure.com/",
  },
];
