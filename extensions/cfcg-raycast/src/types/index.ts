// 解密后的 API 响应类型
export interface DecryptedResponse<T> {
  success: boolean;
  data: T;
  code?: string;
  msg?: string;
}

// API 错误类型
export interface APIError {
  code: string;
  message: string;
  status: number;
}

// 通用查询参数类型
export interface QueryParams {
  [key: string]: string | number | boolean | undefined;
}

// API 端点配置类型
export interface APIEndpoint {
  path: string;
  method: "GET" | "POST";
  requiredParams?: string[];
  optionalParams?: string[];
}

// 导出认证相关类型
export * from "./auth";
