export interface ExtensionPreferences {
  serverAddress: string;
  apiKey: string;
  allowInsecureTls: boolean;
}

export type SystemOverallStatus = "healthy" | "warning" | "critical";
export type AuthStatus = "pending" | "approved" | "rejected";
export type ConnStatus = "online" | "offline";
export type PinMode = "INPUT" | "OUTPUT" | "PWM" | "ADC" | "I2C";

export interface SystemStatusResponse {
  overall_status: SystemOverallStatus;
  database_status: string;
  mqtt_status: string;
  started_at?: string | null;
  uptime_seconds: number;
  advertised_host?: string | null;
  cpu_percent: number;
  memory_used: number;
  memory_total: number;
  storage_used: number;
  storage_total: number;
  retention_days: number;
  active_alert_count: number;
  effective_timezone: string;
  timezone_source: "setting" | "runtime";
  current_server_time: string;
  latest_alert_at?: string | null;
  latest_alert_message?: string | null;
  latest_firmware_revision?: string | null;
}

export interface PinExtraParams {
  min_value?: number;
  max_value?: number;
  input_type?: "switch" | "tachometer" | "dht";
  [key: string]: unknown;
}

export interface PinConfig {
  id?: number;
  device_id?: string;
  gpio_pin: number;
  mode: PinMode;
  function?: string;
  label?: string;
  extra_params?: PinExtraParams | null;
}

export interface DeviceStatePin {
  pin: number;
  mode?: string;
  function?: string;
  label?: string;
  value?: number | boolean;
  brightness?: number;
  temperature?: number;
  humidity?: number;
  restore_value?: number | boolean;
  restore_brightness?: number;
  trend?: string;
  unit?: string;
}

export interface DeviceStateSnapshot {
  kind?: string;
  predicted?: boolean;
  device_id?: string;
  pin?: number;
  value?: number | boolean;
  brightness?: number;
  temperature?: number;
  humidity?: number;
  trend?: string;
  unit?: string;
  pins?: DeviceStatePin[];
}

export interface DeviceConfig {
  device_id: string;
  name: string;
  room_id?: number | null;
  room_name?: string | null;
  auth_status: AuthStatus;
  conn_status: ConnStatus;
  mac_address: string;
  mode: string;
  board?: string | null;
  provider?: string | null;
  extension_name?: string | null;
  installed_extension_id?: string | null;
  device_schema_id?: string | null;
  is_external?: boolean;
  firmware_version?: string | null;
  firmware_revision?: string | null;
  ip_address?: string | null;
  last_seen?: string | null;
  pairing_requested_at?: string | null;
  last_state?: DeviceStateSnapshot | null;
  pin_configurations: PinConfig[];
}

export interface DeviceCommandResponse {
  status: string;
  message?: string;
  command_id?: string;
  last_state?: DeviceStateSnapshot | null;
}

export interface AutomationExecutionLog {
  id: number;
  triggered_at: string;
  status: "success" | "failed";
  log_output?: string | null;
  error_message?: string | null;
}

export interface AutomationResponse {
  id: number;
  name: string;
  is_enabled: boolean;
  graph: {
    nodes: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
  };
  last_triggered?: string | null;
  last_execution?: AutomationExecutionLog | null;
  schedule_type?: string | null;
  timezone?: string | null;
  schedule_hour?: number | null;
  schedule_minute?: number | null;
  schedule_weekdays: string[];
  next_run_at?: string | null;
}

export interface TriggerResponse {
  status: "success" | "failed";
  message: string;
}
