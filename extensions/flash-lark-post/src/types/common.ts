// 共通型定義
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  code: number;
  msg: string;
  data?: T;
}

export interface LarkPreferences {
  larkDomain: string;
  appId: string;
  appSecret: string;
  receiveIdType: "email" | "open_id" | "chat_id";
  receiveId: string;
  prefixTimestamp?: boolean;
}

export interface ChatInfo {
  chat_id: string;
  name: string;
  description?: string;
  chat_type: "p2p" | "group" | "bot";
  avatar?: string;
  is_default?: boolean;
}

export interface FileUploadResult {
  file_key: string;
  file_name: string;
  file_size: number;
  file_type: string;
}

export interface MessageSendResult {
  message_id: string;
  timestamp: string;
  success: boolean;
}

// エラー型
export interface LarkApiError extends Error {
  code?: number;
  details?: string;
}
