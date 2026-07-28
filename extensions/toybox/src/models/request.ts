import type { BodyType, FormEntry, HeaderEntry, HttpMethod, QueryEntry } from "./types";

/**
 * 请求模型，贯穿表单编辑、发送、存储全链路。
 *
 * `url` 与 `query` 保持双向同步：编辑 query 重建 URL 的 search；
 * 编辑 URL 解析 search 回填 query。两者始终一致。
 */
export interface RequestModel {
  method: HttpMethod;
  /** 完整 URL（含 query string），与 {@link query} 双向同步。 */
  url: string;
  headers: HeaderEntry[];
  /** 与 URL 的 query string 双向同步。 */
  query: QueryEntry[];
  bodyType: BodyType;
  /** JSON / Raw Text 的正文。 */
  body: string;
  /** FormData / x-www-form-urlencoded 的键值条目。 */
  formData: FormEntry[];
  /** 超时（毫秒），0 表示不超时。 */
  timeout: number;
  followRedirect: boolean;
}

/** 所有可选的 HTTP 方法，供下拉选择。 */
export const HTTP_METHODS: readonly HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

/** 默认超时（毫秒）。 */
export const DEFAULT_TIMEOUT = 30000;

/** 创建一个空白请求模型。 */
export function createDefaultRequest(): RequestModel {
  return {
    method: "GET",
    url: "",
    headers: [],
    query: [],
    bodyType: "none",
    body: "",
    formData: [],
    timeout: DEFAULT_TIMEOUT,
    followRedirect: true,
  };
}
