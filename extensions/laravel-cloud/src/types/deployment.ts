export interface Deployment {
  id: string;
  type: "deployments";
  attributes: {
    status: DeploymentStatus;
    branch_name: string;
    commit_hash: string;
    commit_message: string;
    commit_author: string | null;
    failure_reason: string | null;
    php_major_version: string;
    build_command: string | null;
    node_version: string;
    uses_octane: boolean;
    uses_hibernation: boolean;
    started_at: string | null;
    finished_at: string | null;
  };
  relationships?: {
    environment?: { data: { id: string; type: string } | null };
    initiator?: { data: { id: string; type: string } | null };
  };
}

export type DeploymentStatus =
  | "pending"
  | "build.pending"
  | "build.created"
  | "build.queued"
  | "build.running"
  | "build.succeeded"
  | "build.failed"
  | "cancelled"
  | "failed"
  | "deployment.pending"
  | "deployment.created"
  | "deployment.queued"
  | "deployment.running"
  | "deployment.succeeded"
  | "deployment.failed";

export interface DeploymentLogs {
  data: {
    build: DeploymentLogPhase;
    deploy: DeploymentLogPhase;
  };
  meta: {
    deployment_status: string;
  };
}

export interface DeploymentLogPhase {
  available: boolean;
  steps: DeploymentLogStep[];
}

export interface DeploymentLogStep {
  step: string;
  status: string;
  description: string;
  output?: string;
  duration_ms?: number;
  time?: string;
}
