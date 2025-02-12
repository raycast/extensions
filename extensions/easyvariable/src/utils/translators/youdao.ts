import axios from "axios";
import * as cheerio from "cheerio";
import { preferences } from "../preferences";

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1";

export const youdaoTranslate = async (text: string): Promise<string[]> => {
  if (!text.trim()) return [];

  if (!preferences?.enableYoudaoTranslate) {
    return [];
  }

  const url = `https://www.youdao.com/result?word=${encodeURIComponent(text)}&lang=en`;

  const response = await axios.get(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
    proxy: false,
    timeout: 10000,
  });

  const $ = cheerio.load(response.data);
  let translations = $(".trans-ce a")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((text) => text.length > 0);

  // 如果 trans-ce 没有结果，尝试从 trans-content 获取
  if (translations.length === 0) {
    translations = $(".trans-content")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((text) => text.length > 0);
  }

  if (translations.length === 0) {
    throw new Error("No translation found");
  }

  return translations;
};
