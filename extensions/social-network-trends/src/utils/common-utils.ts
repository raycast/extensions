import { Icon } from "@raycast/api";
import fetch from "node-fetch";
import { showTrendsTitle, tophubApiKey, trendsNumber } from "../types/preferences";
import { SocialTrend, Trend } from "../types/types";
import { TOPHUB_API_BASE } from "./constants";

export const getNumberIcon = (index: number) => {
  const numberStr = index < 10 ? "0" + index : index.toString();
  return `number-${numberStr}-16` as Icon;
};

export const isEmpty = (str: string | undefined): boolean => {
  return typeof str === "undefined" || str === "";
};

// 定义API响应的类型
interface TophubApiResponse {
  error: boolean;
  status: number;
  data: {
    hashid: string;
    name: string;
    display: string;
    domain: string;
    logo: string;
    items: Array<{
      title: string;
      url: string;
      extra?: string;
      description?: string;
      thumbnail?: string;
    }>;
  };
}

// 通过 tophub API 获取热门数据
export async function fetchTophubTrend(hashid: string): Promise<Trend[]> {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      if (!tophubApiKey) {
        throw new Error("请在插件设置中配置 Tophub API Key");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      const response = await fetch(`${TOPHUB_API_BASE}/nodes/${hashid}`, {
        headers: {
          Authorization: tophubApiKey,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await response.json()) as TophubApiResponse;

      if (data.error) {
        throw new Error(`API 错误: ${data.status}`);
      }

      // 检查API响应是否有效
      if (!data.data || !data.data.items || !Array.isArray(data.data.items)) {
        throw new Error("API 返回的数据格式无效");
      }

      const trends: Trend[] = [];

      for (const item of data.data.items) {
        trends.push({
          name: item.title,
          url: item.url,
          hot: item.extra || "",
        });
      }

      return trends;
    } catch (error) {
      retries++;
      console.error(`Error fetching trends for hashid ${hashid} (attempt ${retries}/${maxRetries}):`, error);

      // 如果是API Key错误，立即抛出，不重试
      if (error instanceof Error && error.message.includes("API Key")) {
        throw error;
      }

      // 如果是最后一次尝试，则返回空数组
      if (retries >= maxRetries) {
        return [];
      }

      // 等待一段时间后重试
      await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
    }
  }

  return []; // 如果所有重试都失败，返回空数组
}

export function getMenubarTitle(socialTrend: SocialTrend[]) {
  if (showTrendsTitle && socialTrend.length > 0 && socialTrend[0].data.length > 0) {
    return socialTrend[0].data[0].name;
  } else {
    return undefined;
  }
}

export function spliceTrends(socialTrend: Trend[], count: number = parseInt(trendsNumber)) {
  return [...socialTrend].splice(0, count);
}
