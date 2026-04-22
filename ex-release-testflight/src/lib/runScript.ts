import { spawn } from "node:child_process";
import fs from "node:fs";
import { BASH_PATH, BUILD_ROOT, IOS_REPO_ROOT, PATH_SUPPLEMENT, SCRIPT_PATH, Stage } from "./config";
import { LIVE_LOG_FILE, STATE_FILE, writeRunState, readRunState } from "./runState";

export interface RunOptions {
  stage: Stage;
  notes?: string;
  notify?: string;
  ts?: string;
  force?: boolean;
  dryRun?: boolean;
  incremental?: boolean;
}

// 拼 scripts/release_testflight.sh 的 args（不含 bash 前缀）
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
  pid: number | null;
  kill: () => void;
}

// ── Wrapper bash template ─────────────────────────────────────────────────────
// 用 String.raw 确保 $VAR 和 $(...) 原样输出到 bash 脚本，不被 JS 模板字符串处理。
// 唯一例外：${} 语法在 JS 模板里仍会被求值 ——
//   bash 变量用 $VAR 而非 ${VAR}，所以不会触发 JS 替换。
const WRAPPER_TEMPLATE = String.raw`#!/bin/bash
# ── Raycast ex-release wrapper (auto-generated, auto-deleted) ─────────────────

# 第一行：把 stdout/stderr 重定向到日志文件。
# 必须在任何写操作之前执行，这样父进程退出后也不会产生 SIGPIPE。
exec > "$WRAPPER_LOG_FILE" 2>&1

echo "[wrapper] started $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "[wrapper] stage=$WRAPPER_STAGE  args: $*"
echo ""

# ── 执行实际发布脚本 ───────────────────────────────────────────────────────────
cd "$WRAPPER_IOS_REPO"
bash -l "$WRAPPER_SCRIPT_PATH" "$@"
EXIT_CODE=$?

echo ""
echo "[wrapper] script exit=$EXIT_CODE  finished $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# ── 解析 TS（仅非 sync 阶段）────────────────────────────────────────────────────
RESOLVED_TS=""
if [ "$WRAPPER_STAGE" != "sync" ]; then
  if [ -n "$WRAPPER_EXPLICIT_TS" ]; then
    # 用户显式传入 --ts
    RESOLVED_TS="$WRAPPER_EXPLICIT_TS"
  elif [ -d "$WRAPPER_BUILD_ROOT" ]; then
    # 找脚本新创建的最新 TS 目录（archive/all 场景）
    _LAST=$(ls -1d "$WRAPPER_BUILD_ROOT"/????????_?????? 2>/dev/null | sort | tail -1)
    if [ -n "$_LAST" ]; then
      RESOLVED_TS=$(basename "$_LAST")
    fi
  fi
fi

echo "[wrapper] resolved_ts=$RESOLVED_TS"

# ── 写回 state JSON ───────────────────────────────────────────────────────────
export WRAPPER_EXIT_CODE="$EXIT_CODE"
export WRAPPER_RESOLVED_TS="$RESOLVED_TS"
export WRAPPER_FINISHED_AT="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

python3 - << 'PYEOF'
import json, os, sys

p = os.environ['WRAPPER_STATE_FILE']
try:
    with open(p) as f:
        data = json.load(f)
    ec = int(os.environ['WRAPPER_EXIT_CODE'])
    data['status'] = 'done' if ec == 0 else 'failed'
    data['exitCode'] = ec
    data['finishedAt'] = os.environ['WRAPPER_FINISHED_AT']
    data['signal'] = None
    ts = os.environ.get('WRAPPER_RESOLVED_TS', '').strip()
    if ts:
        data['ts'] = ts
    with open(p, 'w') as f:
        json.dump(data, f, indent=2)
    print('[wrapper] state updated: status=' + data['status'] + '  ts=' + str(data.get('ts')))
except Exception as e:
    print('[wrapper] WARN: state update failed: ' + str(e), file=sys.stderr)
PYEOF

echo "[wrapper] complete"
rm -f "$0"
`;

/**
 * 启动后台发布任务。
 *
 * 架构：
 *  1. 把 WRAPPER_TEMPLATE 写成 /tmp/ex-release-wrapper-<ts>.sh
 *  2. 以 stdio:ignore + detached 启动 bash，子进程与父进程完全解耦：
 *     - 没有 pipe → 父进程退出时不会产生 SIGPIPE
 *     - wrapper 第一行 exec redirect → 所有输出写入 LIVE_LOG_FILE
 *     - wrapper 最后调 python3 写回 state JSON → 不依赖前台 .then()
 *  3. 返回 {pid, kill}，不返回 promise；调用方轮询 state 文件感知进度。
 */
export function runScript(opts: RunOptions): RunHandle {
  const scriptArgs = buildArgs(opts);
  const wrapperPath = `/tmp/ex-release-wrapper-${Date.now()}.sh`;

  // 写 wrapper 脚本
  fs.writeFileSync(wrapperPath, WRAPPER_TEMPLATE, { mode: 0o755, encoding: "utf8" });

  const child = spawn(BASH_PATH, ["-l", wrapperPath, ...scriptArgs], {
    cwd: IOS_REPO_ROOT,
    detached: true,
    stdio: ["ignore", "ignore", "ignore"], // 完全与父进程 I/O 解耦
    env: {
      ...process.env,
      PATH: `${PATH_SUPPLEMENT}:${process.env.PATH ?? ""}`,
      LANG: process.env.LANG ?? "en_US.UTF-8",
      LC_ALL: process.env.LC_ALL ?? "en_US.UTF-8",
      // wrapper 通过 env 取所有配置，避免 bash 脚本内嵌路径时引号转义问题
      WRAPPER_LOG_FILE: LIVE_LOG_FILE,
      WRAPPER_STATE_FILE: STATE_FILE,
      WRAPPER_SCRIPT_PATH: SCRIPT_PATH,
      WRAPPER_IOS_REPO: IOS_REPO_ROOT,
      WRAPPER_BUILD_ROOT: BUILD_ROOT,
      WRAPPER_STAGE: opts.stage,
      WRAPPER_EXPLICIT_TS: opts.ts?.trim() ?? "",
    },
  });

  // 父进程不需要等待子进程退出（wrapper 自己写 state）
  child.unref();

  const pid = child.pid ?? null;

  // 捕获 spawn 本身的错误（如 bash not found），立即将 state 标记为失败
  child.on("error", (err) => {
    try {
      const state = readRunState();
      if (state && state.status === "running") {
        writeRunState({
          ...state,
          status: "failed",
          exitCode: -1,
          finishedAt: new Date().toISOString(),
          signal: null,
        });
      }
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(wrapperPath);
    } catch {
      /* ignore */
    }
    console.error("[runScript] spawn error:", err);
  });

  return {
    pid,
    kill: () => {
      if (!pid) return;
      try {
        // detached 下 pid 即进程组 ID，负号杀掉整组（bash + xcodebuild 等子孙）
        process.kill(-pid, "SIGTERM");
      } catch {
        try {
          process.kill(pid, "SIGTERM");
        } catch {
          /* ignore */
        }
      }
    },
  };
}
