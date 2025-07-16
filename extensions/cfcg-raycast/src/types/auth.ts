// 用户信息类型
export interface User {
  id: number;
  name: string;
  apikey: string;
  createdAt: number;
  isAdmin: number; // 0: 普通用户 1: 管理员
  enabled: number; // 0: 禁用 1: 启用
}

// 认证上下文类型
export interface AuthContext {
  user: User;
  isAuthenticated: boolean;
}

// API 密钥响应类型
export interface ApiKeyResponse {
  success: boolean;
  data?: {
    apikey: string;
    user: Omit<User, "apikey">;
  };
  error?: {
    code: string;
    message: string;
  };
}

// 创建用户请求类型
export interface CreateUserRequest {
  name: string;
}

// 认证错误类型
export interface AuthError {
  code: "INVALID_API_KEY" | "MISSING_API_KEY" | "USER_NOT_FOUND" | "AUTH_ERROR";
  message: string;
  status: number;
}

// 权限级别枚举
export enum PermissionLevel {
  READ = "read",
  WRITE = "write",
  ADMIN = "admin",
}

// API 端点权限配置
export interface EndpointPermission {
  path: string;
  method: string;
  requiredPermission: PermissionLevel;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}
