export interface Funnel {
  id: string;
  websiteId: string;
  name: string;
  description?: string | null;
  steps: FunnelStep[];
  ignoreHistoricData?: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FunnelStep {
  type: string;
  target: string;
  name?: string;
}

export interface FunnelAnalytics {
  overall_conversion_rate: number;
  total_users_entered: number;
  total_users_completed: number;
  avg_completion_time: number;
  avg_completion_time_formatted: string;
  biggest_dropoff_step: number;
  biggest_dropoff_rate: number;
  steps_analytics: FunnelStepAnalytics[];
}

export interface FunnelStepAnalytics {
  step_number: number;
  step_name: string;
  users: number;
  total_users: number;
  conversion_rate: number;
  dropoffs: number;
  dropoff_rate: number;
  avg_time_to_complete: number;
  error_count: number;
  error_rate: number;
  top_errors: { message: string; error_type: string; count: number }[];
}
