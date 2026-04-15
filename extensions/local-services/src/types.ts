// -- Types for Local Services extension --

export type ServiceSource = "lsof" | "docker" | "hosts" | "compose";

export type ServiceStatus = "running" | "stopped" | "declared";

export type ProcessType = "node" | "python" | "ruby" | "go" | "java" | "docker" | "php" | "rust" | "other";

export interface LocalService {
  id: string;
  port: number;
  pid?: number;
  processName: string;
  address: string;
  source: ServiceSource;
  status: ServiceStatus;
  processType: ProcessType;

  // Docker-specific
  containerName?: string;
  containerImage?: string;
  containerId?: string;

  // Hosts-specific
  hostname?: string;

  // Compose-specific
  composeFile?: string;
  composeName?: string;
}

export interface DockerContainer {
  ID: string;
  Names: string;
  Image: string;
  Status: string;
  Ports: string;
  State: string;
}
