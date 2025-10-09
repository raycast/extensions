/**
 * API-related types
 * Centralized definitions for API requests, responses, and error handling
 */

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
  success: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status?: number;
  timestamp?: string;
  path?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTtl?: number;
}

export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// Daytona-specific API types
export interface DaytonaApiSandbox {
  id: string;
  name: string;
  workspaceId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  repository?: {
    url: string;
    branch: string;
    commit?: string;
  };
  image?: string;
  resources?: {
    cpus: number;
    memory: string;
    disk: string;
  };
  metadata?: Record<string, unknown>;
}

export interface DaytonaApiWorkspace {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  sandboxes: DaytonaApiSandbox[];
}

export interface DaytonaApiSnapshot {
  id: string;
  name: string;
  sandboxId: string;
  createdAt: string;
  size?: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface DaytonaApiExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  artifacts?: Array<{
    name: string;
    content: string;
    type: string;
  }>;
}

export interface DaytonaApiProcessOptions {
  command: string[];
  workingDir?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export interface DaytonaApiFileOperation {
  operation: "read" | "write" | "delete" | "list" | "create_dir";
  path: string;
  content?: string;
  encoding?: "utf-8" | "base64";
  recursive?: boolean;
}

export interface DaytonaApiFileInfo {
  name: string;
  path: string;
  type: "file" | "directory" | "symlink";
  size: number;
  modified: string;
  permissions: string;
  isHidden: boolean;
}
