declare module "node:child_process" {
  export type ExecFileChildProcess = {
    pid?: number;
  };

  export function execFile(
    file: string,
    args: string[],
    callback: (error: Error | null) => void,
  ): ExecFileChildProcess;
}

declare module "node:fs" {
  export function readFileSync(path: string | URL, encoding: "utf8"): string;
}

declare const process: {
  kill: (pid: number) => void;
};
