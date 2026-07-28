import type { RequestModel } from "./request";

/** Cookie 条目。 */
export interface CookieEntry {
  name: string;
  value: string;
}

/** 响应模型，由 `services/http.ts` 归一化产出。 */
export interface ResponseModel {
  status: number;
  statusText: string;
  headers: [string, string][];
  cookies: CookieEntry[];
  body: string;
  contentType: string;
  /** 耗时（毫秒）。 */
  duration: number;
  /** 响应体大小（字节）。 */
  size: number;
}

/** 历史与收藏中保存的响应摘要（不存完整响应体，控制 LocalStorage 体积）。 */
export interface ResponseSummary {
  status: number;
  statusText: string;
  duration: number;
  size: number;
  contentType: string;
}

/** 历史记录条目，FIFO 最多 20 条。 */
export interface HistoryModel {
  id: string;
  request: RequestModel;
  responseSummary: ResponseSummary;
  createdAt: number;
}

/** 收藏条目，不限数量。 */
export interface FavoriteModel {
  id: string;
  request: RequestModel;
  title: string;
  createdAt: number;
}
