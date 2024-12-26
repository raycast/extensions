import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  apiKey: string;
  secretKey: string;
  requestInterval: string; // 请求间隔时间（毫秒）
  maxConcurrent: string; // 最大并发数
  batchSize: string; // 每批处理数量
}

export const getConfig = (): Preferences => {
  const preferences = getPreferenceValues<Preferences>();
  return {
    apiKey: preferences.apiKey,
    secretKey: preferences.secretKey,
    requestInterval: preferences.requestInterval || "1000", // 默认1秒
    maxConcurrent: preferences.maxConcurrent || "5", // 默认最大并发5个请求
    batchSize: preferences.batchSize || "20", // 默认每批20个
  };
};
