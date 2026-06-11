export interface Instance {
  id: string;
  type: "instances";
  attributes: {
    name: string;
    type: InstanceType;
    size: string;
    scaling_type: InstanceScalingType;
    min_replicas: number;
    max_replicas: number;
    uses_scheduler: boolean;
    scaling_cpu_threshold_percentage: number | null;
    scaling_memory_threshold_percentage: number | null;
    created_at: string | null;
  };
  relationships?: {
    environment?: { data: { id: string; type: string } | null };
    backgroundProcesses?: { data: { id: string; type: string }[] };
  };
}

export type InstanceType = "app" | "service" | "queue";
export type InstanceScalingType = "none" | "custom" | "auto";
