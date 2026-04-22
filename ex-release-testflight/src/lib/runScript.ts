import { spawn } from "node:child_process";
import { BASH_PATH, IOS_REPO_ROOT, PATH_SUPPLEMENT, SCRIPT_PATH, Stage } from "./config";

export interface RunOptions {
  stage: Stage;
  notes?: string;
  notify?: string;
  ts?: string;
  force?: boolean;
  dryRun?: boolean;
  incremental?: boolean;
}

export interface RunResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  args: string[];
  cwd: string;
}

// 拼 scripts/release_testflight.sh 的 args(不含 bash 前缀)
// 规则来自脚本 usage:空值的可选 flag 不追加。
export function buildArgs(opts: RunOptions): string[] {
  const args: string[] = [];
  args.push(opts.stage);
  if (opts.notes && opts.notes.trim()) args.push("--notes", opts.notes);
  if (opts.notify && opts.notify.trim()) args.push("--notify", opts.notify);
  if (opts.ts && opts.ts.trim()) args.push("--ts", opts.ts);
  if (opts.force) args.push("--force");
  if (opts.dryRun) args.push("--dry-run");
  if (opts.incremental) args.push("--incremental");
  return args;
}

export interface RunHandle {
  promise: Promise<RunResult>;
  kill: () => void;
}

// 启动 shell 脚本,把 stdout/stderr 流式回调;不解析内容。
// onChunk(chunk, stream) 在每次 data 事件时触发,UI 层负责累积/截断。
export function runScript(
  opts: RunOptions,
  onChunk: (chunk: string, stream: "stdout" | "stderr") => void,
): RunHandle {
  const scriptArgs = buildArgs(opts);
  // login shell 以便继承用户 PATH、xcrun 等;脚本路径用绝对路径,cwd 显式为 iOS repo。
  const bashArgs = ["-l", SCRIPT_PATH, ...scriptArgs];

  // detached:true 让 bash 处于独立进程组,
  //   1) Raycast 扩展进程被运行时回收时,bash 不会被连带 SIGTERM,
  //      shell 仍能跑完发布事务、写出 result.json;
  //   2) 显式 kill 时用 process.kill(-pid, ...) 一次性终结整个进程组
  //      (bash + xcodebuild + altool 等子孙进程都会收到信号)。
  const child = spawn(BASH_PATH, bashArgs, {
    cwd: IOS_REPO_ROOT,
    detached: true,
    env: {
      ...process.env,
      PATH: `${PATH_SUPPLEMENT}:${process.env.PATH ?? ""}`,
      LANG: process.env.LANG ?? "en_US.UTF-8",
      LC_ALL: process.env.LC_ALL ?? "en_US.UTF-8",
    },
  });

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (d: string) => onChunk(d, "stdout"));
  child.stderr.on("data", (d: string) => onChunk(d, "stderr"));

  const promise = new Promise<RunResult>((resolve, reject) => {
    child.on("error", (err) => reject(err));
    child.on("close", (code, signal) => {
      resolve({ exitCode: code, signal, args: bashArgs, cwd: IOS_REPO_ROOT });
    });
  });

  return {
    promise,
    kill: () => {
      if (child.killed || child.exitCode !== null) return;
      const pid = child.pid;
      if (!pid) return;
      try {
        // detached 下 pid 本身就是进程组 ID,负号发给整组
        process.kill(-pid, "SIGTERM");
      } catch {
        try {
          child.kill("SIGTERM");
        } catch {
          /* ignore */
        }
      }
    },
  };
}
