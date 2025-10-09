// Workspace types and interfaces
export interface Workspace {
  id: string;
  name: string;
  status: "running" | "stopped" | "creating" | "deleting" | "error";
  language: string;
  createdAt: Date;
  lastAccessedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface WorkspaceCreateOptions {
  name: string;
  language: "python" | "javascript" | "typescript" | "go" | "rust" | "java";
  template?: string;
  environment?: Record<string, string>;
  resources?: {
    cpu?: number;
    memory?: string;
    disk?: string;
  };
}

export interface WorkspaceListOptions {
  status?: Workspace["status"];
  language?: string;
  limit?: number;
  offset?: number;
}

// NOTE: WorkspaceRegistry and getDaytonaClient removed - use the one from daytona-client.ts instead
