import fetch from "node-fetch";
import { WubiApiResponse, WubiSearchResult } from "./types";

const API_URL = "https://www.iamwawa.cn/home/wubi/ajax";
const IMAGE_BASE_URL = "https://www.iamwawa.cn/Data/wubi/";

export async function queryWubiEncoding(
  hanzi: string
): Promise<WubiSearchResult[]> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://www.iamwawa.cn",
        referer: "https://www.iamwawa.cn/wubi.html",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
        "x-requested-with": "XMLHttpRequest",
      },
      body: `hanzi=${encodeURIComponent(hanzi)}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as WubiApiResponse;

    if (data.status !== 1 || !data.data || data.data.length === 0) {
      return [];
    }

    // Return all results
    const results: WubiSearchResult[] = data.data.map((item) => ({
      ...item,
      imageUrl: `${IMAGE_BASE_URL}${encodeURIComponent(item.hanzi)}.png`,
    }));

    return results;
  } catch (error) {
    // Log error for debugging
    throw new Error(
      error instanceof Error ? error.message : "Failed to query Wubi encoding"
    );
  }
}

export function getCharacterImageUrl(hanzi: string): string {
  return `${IMAGE_BASE_URL}${encodeURIComponent(hanzi)}.png`;
}
