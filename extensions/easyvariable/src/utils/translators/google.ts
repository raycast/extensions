import { getPreferenceValues } from "@raycast/api";
import { translate } from "@vitalets/google-translate-api";
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";
import * as cheerio from "cheerio";

const preferences = getPreferenceValues<ExtensionPreferences>();

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1";

export const googleTranslate = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  if (!preferences?.enableGoogleTranslate) {
    return "";
  }

  try {
    const proxyAgent = preferences?.httpProxy?.trim() ? new HttpsProxyAgent(preferences.httpProxy) : undefined;

    // Try using web version translation, @vitalets/google-translate-api will ban IPs with too many requests
    const url = `https://translate.google.com/m?sl=auto&tl=en&hl=en&q=${encodeURIComponent(text)}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: 10000,
      httpsAgent: proxyAgent,
      // Disable axios default proxy
      proxy: false,
    });

    const $ = cheerio.load(response.data);
    const resultContainer = $(".result-container");
    const translation = resultContainer.length ? resultContainer.text().trim() : "";
    return translation;
  } catch (error) {
    // Fallback to @vitalets/google-translate-api
    const { text: translated } = await translate(text, {
      fetchOptions: {
        agent: preferences?.httpProxy?.trim() ? new HttpsProxyAgent(preferences.httpProxy) : undefined,
      },
    });
    return translated;
  }
};
