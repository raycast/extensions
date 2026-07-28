/**
 * HTTP Client 的基础领域类型。
 *
 * Header / Query / FormData 统一使用 {@link KeyValuePair} 三元组结构，
 * 以保留顺序、支持重复 key、支持单条启停--Record 无法表达这些 HTTP 语义。
 */

/** 支持的 HTTP 方法。 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

/** Body 的类型。 */
export type BodyType = "none" | "json" | "formData" | "urlencoded" | "raw";

/**
 * 键值对条目，Header / Query / FormData 共用。
 *
 * - `enabled`：单条启停开关。禁用的条目在发送请求时会被跳过，
 *   但仍保留在表单中以便随时重新启用。
 */
export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

/** Header 条目。 */
export type HeaderEntry = KeyValuePair;

/** Query 条目。 */
export type QueryEntry = KeyValuePair;

/** FormData / x-www-form-urlencoded 条目。 */
export type FormEntry = KeyValuePair;
