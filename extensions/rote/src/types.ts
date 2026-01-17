// Rote API Types - Bearer Token 认证方式

export interface RotePreferences {
  apiEndpoint: string;
  webUrl?: string;
  username: string;
  password: string;
  quickAddTag?: string;
}

// 登录响应
export interface LoginResponse {
  user: {
    id: string;
    username: string;
    nickname?: string;
    email?: string;
    avatar?: string;
  };
  accessToken: string;
  refreshToken: string;
}

// Token 刷新响应
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// 存储的 Token 信息
export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface Note {
  id: string; // 注意：实际API返回的是id，不是_id
  content: string;
  title?: string;
  tags?: string[];
  state: "public" | "private";
  archived?: boolean;
  pin?: boolean;
  type?: string;
  editor?: string;
  createdAt: string;
  updatedAt: string;
  authorid?: string;
  articleId?: string | null;
  author?: {
    username: string;
    nickname?: string;
    avatar?: string;
    emailVerified?: boolean;
  };
  attachments?: Attachment[];
  reactions?: unknown[];
  article?: unknown | null;
}

export interface Attachment {
  id: string;
  url: string;
  compressUrl?: string;
  userid?: string;
  roteid?: string;
  storage?: string;
  details?: {
    key: string;
    size: number;
    mtime: string;
    mimetype: string;
    compressKey?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  sortIndex?: number;
}

export interface CreateNotePayload {
  content: string;
  title?: string;
  tags?: string[];
  state?: "public" | "private";
}

export interface UpdateNotePayload {
  content?: string;
  title?: string;
  tags?: string[];
  state?: "public" | "private";
  pin?: boolean;
  archived?: boolean;
}

export interface SearchParams {
  keyword: string;
  skip?: number;
  limit?: number;
}

export interface ListParams {
  skip?: number;
  limit?: number;
  archived?: boolean;
  tag?: string;
}
