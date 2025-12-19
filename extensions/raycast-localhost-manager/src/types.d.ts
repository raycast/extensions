declare module "pidusage" {
  interface Stats {
    cpu: number;
    memory: number;
    ppid: number;
    pid: number;
    ctime: number;
    elapsed: number;
    timestamp: number;
  }

  function pidusage(pid: number): Promise<Stats>;
  function pidusage(pids: number[]): Promise<{ [pid: number]: Stats }>;

  export = pidusage;
}

// Ensure Preferences namespace is available
/// <reference path="../raycast-env.d.ts" />
