/**
 * Sandbox domain types
 * Centralized definitions for sandbox-related data structures
 */

export type SandboxStatus = "running" | "stopped" | "creating" | "deleting" | "starting" | "stopping";

export interface Sandbox {
  id: string;
  name: string;
  status: SandboxStatus;
  repository?: string;
  repositoryUrl?: string;
  branch?: string;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
  // Additional fields from Daytona API
  workspaceId?: string;
  image?: string;
  user?: string;
  cpus?: number;
  memory?: number;
  disk?: number;
}

export interface CreateSandboxForm {
  name: string;
  repository: string;
  branch?: string;
  image?: string;
}

export interface SandboxCreateOptions {
  name: string;
  repository: string;
  branch?: string;
  image?: string;
  envVars?: Record<string, string>;
}

export interface SandboxUpdateOptions {
  name?: string;
  status?: SandboxStatus;
  metadata?: Record<string, unknown>;
}

export interface SandboxListOptions {
  page?: number;
  limit?: number;
  status?: SandboxStatus;
  search?: string;
}

export interface SandboxActions {
  start: (sandbox: Sandbox) => Promise<void>;
  stop: (sandbox: Sandbox) => Promise<void>;
  restart: (sandbox: Sandbox) => Promise<void>;
  delete: (sandbox: Sandbox) => Promise<void>;
  clone: (sandbox: Sandbox) => Promise<void>;
  openFiles: (sandbox: Sandbox) => void;
  openGitManager: (sandbox: Sandbox) => void;
  openInBrowser: (sandbox: Sandbox) => void;
  copyId: (sandbox: Sandbox) => void;
}

export type SandboxActionType = keyof SandboxActions;

// Cache interfaces
export interface SandboxInfo {
  id: string;
  name: string;
  status: SandboxStatus;
  lastSeen: string;
  repository?: string;
  metadata?: Record<string, unknown>;
}

export interface SandboxCacheItem {
  data: Sandbox;
  timestamp: number;
  ttl: number;
}
