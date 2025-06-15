export type RateLimitObjectType = "fast" | "consistent";
type RateLimitObject = {
  type: RateLimitObjectType;
  limit: number;
  refillRate: number;
  refillInterval: number;
};

// APIs
export type GetApiInfoResponse = {
  id: string;
  name: string;
  workspaceId: string;
};
export type GetApiKeysQuery = {
  limit: string;
  offset: string;
  ownerId?: string;
};
export type ApiKey = {
  id: string;
  apiId: string;
  workspaceId: string;
  start: string;
  ownerId?: string;
  meta?: MetaObject;
  createdAt: number;
  expires: number;
  remaining: number;
  ratelimit?: RateLimitObject;
};
export type GetApiKeysResponse = {
  keys: ApiKey[];
  total: number;
};

// Keys
type MetaObject = {
  [key: string]: string;
};
export type CreateKeyRequest = {
  apiId: string;
  prefix?: string;
  byteLength?: number;
  ownerId?: string;
  meta?: MetaObject;
  expires?: number;
  remaining?: number;
  ratelimit?: RateLimitObject;
};
export type CreateKeyForm = {
  apiId: string;
  prefix?: string;
  byteLength?: string;
  ownerId?: string;
  meta?: string;
  expires: Date | null;
  remaining?: string;
  ratelimitType?: string;
  ratelimitLimit?: string;
  ratelimitRefillRate?: string;
  ratelimitRefillInterval?: string;
};
export type CreateKeyResponse = {
  key: string;
  keyId: string;
};
export type UpdateKeyRequest = {
  ownerId: string | null;
  meta: string | null;
  expires: number | null;
  ratelimit: RateLimitObject | null;
  remaining: number | null;
};
export type UpdateKeyForm = {
  ownerId?: string;
  meta?: string;
  expires?: Date | null;
  remaining?: string;
  ratelimitType?: string;
  ratelimitLimit?: string;
  ratelimitRefillRate?: string;
  ratelimitRefillInterval?: string;
};

export type VerifyKeyRequest = {
  key: string;
};
export type VerifyKeyResponse = {
  valid: boolean;
  ownerId?: string;
  meta?: MetaObject;
  ratelimit: {
    limit: number;
    remaining: number;
    reset: number;
  };
  remaining?: number;
};

type RevokeKeyRequest = {
  keyId: string;
};
export type RevokeKeyResponse = Record<string, never>;

export type ApiHeaders = {
  "Content-Type": "application/json";
  Authorization?: string;
};
export type ApiMethod = "GET" | "POST" | "DELETE" | "PUT";
export type BodyRequest = CreateKeyRequest | VerifyKeyRequest | UpdateKeyRequest | RevokeKeyRequest;
export type ErrorResponse = { code: string; error?: string };
export type NewErrorResponse = {
  error: {
    code: string;
    message: string;
    docs: string;
    requestId: string;
  };
};
