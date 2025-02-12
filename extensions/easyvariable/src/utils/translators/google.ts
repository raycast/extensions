import { translate } from "@vitalets/google-translate-api";
import { HttpsProxyAgent } from "https-proxy-agent";
import { preferences } from "../preferences";
import axios from "axios";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1";

export const googleTranslate = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  if (!preferences?.enableGoogleTranslate) {
    return "";
  }

  try {
    const proxyAgent = preferences?.httpProxy?.trim() ? new HttpsProxyAgent(preferences.httpProxy) : undefined;

    // 尝试使用网页版翻译,@vitalets/google-translate-api会ban请求较多的IP
    const url = `https://translate.google.com/m?sl=auto&tl=en&hl=en&q=${encodeURIComponent(text)}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      timeout: 10000,
      httpsAgent: proxyAgent,
      proxy: false, // 禁用 axios 默认代理
    });

    const $ = cheerio.load(response.data);
    const translation = $(".result-container").text().trim();

    return translation;
  } catch (error) {
    // 如果网页版失败，回退到 API 版本
    const { text: translated } = await translate(text, {
      fetchOptions: {
        agent: preferences?.httpProxy?.trim() ? new HttpsProxyAgent(preferences.httpProxy) : undefined,
      },
    });
    return translated;
  }
};
