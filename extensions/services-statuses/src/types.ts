export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  user?: string;
  port?: number;
  services?: string[]; // Specific service names to track (empty = all)
  healthCheckUrl?: string; // Optional HTTP health check URL (e.g., for WordPress sites)
  project?: string; // Optional project/group name
}

export interface PM2Process {
  name: string;
  pid: number;
  pm_id: number;
  pm2_env: {
    status: string;
    restart_time: number;
    created_at: number;
    uptime?: number;
  };
  monit: {
    cpu: number;
    memory: number;
  };
}

export interface HealthCheck {
  status: "healthy" | "unhealthy";
  httpCode?: number;
  error?: string;
}

export interface ServerStatus {
  server: ServerConfig;
  processes: PM2Process[];
  healthCheck?: HealthCheck;
  error?: string;
}
