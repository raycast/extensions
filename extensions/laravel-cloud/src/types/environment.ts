export interface Environment {
  id: string;
  type: "environments";
  attributes: {
    name: string;
    slug: string;
    status: EnvironmentStatus;
    vanity_domain: string | null;
    php_major_version: string;
    build_command: string | null;
    deploy_command: string | null;
    node_version: string;
    uses_octane: boolean;
    uses_hibernation: boolean;
    uses_push_to_deploy: boolean;
    uses_deploy_hook: boolean;
    environment_variables: EnvironmentVariable[];
    created_at: string | null;
  };
  relationships?: {
    application?: { data: { id: string; type: string } | null };
    currentDeployment?: { data: { id: string; type: string } | null };
    primaryDomain?: { data: { id: string; type: string } | null };
    instances?: { data: { id: string; type: string }[] };
  };
}

export type EnvironmentStatus = "deploying" | "running" | "hibernating" | "stopped";

export interface EnvironmentVariable {
  key: string;
  value: string;
}

export type EnvironmentVariablesInsertMethod = "append" | "set";
