// Portainer API Types

// Endpoint (Environment) types
export interface Endpoint {
  Id: number;
  Name: string;
  Type: number;
  URL: string;
  Status: number;
  Snapshots?: EndpointSnapshot[];
}

export interface EndpointSnapshot {
  DockerVersion: string;
  TotalCPU: number;
  TotalMemory: number;
  RunningContainerCount: number;
  StoppedContainerCount: number;
  HealthyContainerCount: number;
  UnhealthyContainerCount: number;
  VolumeCount: number;
  ImageCount: number;
  StackCount: number;
}

// Container types (Docker API format proxied through Portainer)
export interface Container {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: ContainerState;
  Status: string;
  Ports: ContainerPort[];
  Labels: Record<string, string>;
  NetworkSettings: {
    Networks: Record<string, ContainerNetwork>;
  };
  Mounts: ContainerMount[];
}

export type ContainerState =
  | "running"
  | "exited"
  | "paused"
  | "restarting"
  | "dead"
  | "created"
  | "removing";

export interface ContainerPort {
  IP?: string;
  PrivatePort: number;
  PublicPort?: number;
  Type: "tcp" | "udp";
}

export interface ContainerNetwork {
  NetworkID: string;
  IPAddress: string;
  Gateway: string;
  MacAddress: string;
}

export interface ContainerMount {
  Type: string;
  Name?: string;
  Source: string;
  Destination: string;
  Mode: string;
  RW: boolean;
}

// Container details (for inspect)
export interface ContainerDetails {
  Id: string;
  Created: string;
  Path: string;
  Args: string[];
  State: {
    Status: ContainerState;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    OOMKilled: boolean;
    Dead: boolean;
    Pid: number;
    ExitCode: number;
    Error: string;
    StartedAt: string;
    FinishedAt: string;
  };
  Name: string;
  RestartCount: number;
  Config: {
    Hostname: string;
    Env: string[];
    Image: string;
    Labels: Record<string, string>;
  };
  NetworkSettings: {
    IPAddress: string;
    Ports: Record<string, Array<{ HostIp: string; HostPort: string }> | null>;
    Networks: Record<string, ContainerNetwork>;
  };
}

// Stack types
export interface Stack {
  Id: number;
  Name: string;
  Type: StackType;
  EndpointId: number;
  Status: StackStatus;
  CreationDate: number;
  UpdateDate: number;
  Env?: StackEnvVar[];
  ResourceControl?: {
    Id: number;
    OwnerId: number;
  };
}

export enum StackType {
  SwarmStack = 1,
  ComposeStack = 2,
  KubernetesStack = 3,
}

export enum StackStatus {
  Active = 1,
  Inactive = 2,
}

export interface StackEnvVar {
  name: string;
  value: string;
}

// Image types (Docker API format)
export interface DockerImage {
  Id: string;
  ParentId: string;
  RepoTags: string[] | null;
  RepoDigests: string[] | null;
  Created: number;
  Size: number;
  VirtualSize: number;
  Labels: Record<string, string> | null;
  Containers: number;
}

// Volume types (Docker API format)
export interface Volume {
  Name: string;
  Driver: string;
  Mountpoint: string;
  CreatedAt?: string;
  Status?: Record<string, string>;
  Labels: Record<string, string> | null;
  Scope: "local" | "global";
  Options: Record<string, string> | null;
  UsageData?: {
    Size: number;
    RefCount: number;
  };
}

export interface VolumeListResponse {
  Volumes: Volume[];
  Warnings: string[] | null;
}

// Network types (Docker API format)
export interface Network {
  Id: string;
  Name: string;
  Created: string;
  Scope: "local" | "swarm" | "global";
  Driver: string;
  EnableIPv6: boolean;
  IPAM: {
    Driver: string;
    Config: Array<{
      Subnet?: string;
      Gateway?: string;
    }>;
  };
  Internal: boolean;
  Attachable: boolean;
  Ingress: boolean;
  Labels: Record<string, string> | null;
  Containers?: Record<
    string,
    {
      Name: string;
      EndpointID: string;
      MacAddress: string;
      IPv4Address: string;
      IPv6Address: string;
    }
  >;
}

// Preferences types
export interface Preferences {
  portainerUrl: string;
  apiKey: string;
  defaultEndpointId: string;
}

// API Response types
export interface PortainerError {
  message: string;
  details?: string;
}
