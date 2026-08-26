declare module "rust:../rust" {
  export interface KeepAwakeConfig {
    preventDisplay: boolean;
    preventSystem: boolean;
    durationSeconds: number | null;
    pid: number | null;
    windowHandle: number | null;
  }

  export interface ProcessInfo {
    name: string;
    pid: number;
    windowHandle: number;
  }

  export interface CaffeinateStatus {
    running: boolean;
    startTime: number | null;
    durationSeconds: number | null;
  }

  export function start_caffeinate(config: KeepAwakeConfig): Promise<void>;
  export function stop_caffeinate(): Promise<void>;
  export function is_caffeinate_running(): Promise<{ running: boolean }>;
  export function get_caffeinate_state(): Promise<CaffeinateStatus>;
  export function list_processes(): Promise<ProcessInfo[]>;
}
