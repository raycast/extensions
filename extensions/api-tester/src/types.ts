export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type AuthType = "none" | "bearer" | "apikey" | "basic";

export type BodyType =
  | "none"
  | "json"
  | "form-data"
  | "x-www-form-urlencoded"
  | "raw";

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  type?: "text" | "file"; // For form-data: distinguish between text and file fields
  filePath?: string; // For file uploads
}

export interface AuthConfig {
  type: AuthType;
  bearer?: {
    token: string;
  };
  apikey?: {
    key: string;
    value: string;
    addTo: "header" | "query";
  };
  basic?: {
    username: string;
    password: string;
  };
}

export interface RequestBody {
  type: BodyType;
  json?: string;
  formData?: KeyValue[];
  urlEncoded?: KeyValue[];
  raw?: string;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  queryParams: KeyValue[];
  auth: AuthConfig;
  body: RequestBody;
  collectionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTime: number;
  size: number;
  actualUrl: string; // The actual URL sent (with variables replaced)
}

export interface RequestHistory {
  id: string;
  request: ApiRequest;
  response: ApiResponse;
  timestamp: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: ApiRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorageData {
  collections: Collection[];
  history: RequestHistory[];
  environments: Environment[];
}
