import FirecrawlApp from "@mendable/firecrawl-js";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues();
const firecrawl = new FirecrawlApp({
  apiKey: preferences.apiKey || "no-api-key",
  apiUrl: !preferences.apiKey ? "https://extensions-api-proxy.raycast.com/firecrawl" : "https://api.firecrawl.dev",
});

export default firecrawl;
