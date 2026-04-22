import { Action, ActionPanel, Detail, Icon, open, showInFinder } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  FinalStatus,
  ResultJson,
  StageStatus,
  absLogDir,
  absResultJsonPath,
  findLatestTsDir,
  readResultJson,
  readSummaryText,
} from "./resultFile";
import { RunState, isProcessAlive, readLiveLog, readRunState } from "./runState";

export interface LivePollViewProps {
  /** 初始运行状态（由调用方在 spawn 后立即传入）*/
  state: RunState;
}

/**
 * 轮询式进度/结果视图。
 *
 * - 每 500ms 读取 LIVE_LOG_FILE 刷新终端输出
 * - 每 1500ms 读取 STATE_FILE 检测完成状态
 * - 检测到进程不存活后，最多再等 ~4.5s 让 wrapper 写回最终 state
 * - 完成后读取 result.json / *.summary.txt
 * - 不依赖任何 JS promise / pipe，关闭视图或重启 Raycast 均可恢复
 */
export function LivePollView({ state: initialState }: LivePollViewProps) {
  const [log, setLog] = useState<string>(() => readLiveLog());
  const [state, setState] = useState<RunState>(initialState);
  const [result, setResult] = useState<ResultJson | null>(null);
  const [failedSummary, setFailedSummary] = useState<string | null>(null);
  const [failedStageName, setFailedStageName] = useState<string | null>(null);

  const isSync = state.stage === "sync";
  const label = isSync ? "sync" : "发布";
  const running = state.status === "running" && isProcessAlive(state.pid);

  function loadResult(ts: string | null) {
    if (isSync) return;
    const resolvedTs = ts ?? findLatestTsDir();
    if (!resolvedTs) return;
    const r = readResultJson(resolvedTs);
    setResult(r);
    if (!r) return;
    const failed = r.stages.find((s) => s.status === "failed");
    if (failed) {
      setFailedStageName(failed.name);
      setFailedSummary(readSummaryText(resolvedTs, failed.summary));
    }
  }

  useEffect(() => {
    // ── 挂载时：如果已经完成，直接读结果 ─────────────────────────────────────
    if (initialState.status !== "running") {
      setLog(readLiveLog());
      loadResult(initialState.ts);
      return;
    }

    // ── 挂载时：进程已不存在，re-read state 再决定 ──────────────────────────
    if (!isProcessAlive(initialState.pid)) {
      const fresh = readRunState();
      const finalState = fresh ?? initialState;
      setState({ ...finalState, status: fresh?.status !== "running" ? (fresh?.status ?? "failed") : "failed" });
      setLog(readLiveLog());
      loadResult(finalState.ts);
      return;
    }

    // ── 进程仍在运行：启动轮询 ───────────────────────────────────────────────
    let deadCount = 0; // 连续检测到 pid 不存活的次数

    const logTimer = setInterval(() => {
      setLog(readLiveLog());
    }, 500);

    const stateTimer = setInterval(() => {
      const fresh = readRunState();

      // wrapper 已写回最终状态
      if (fresh && fresh.status !== "running") {
        clearInterval(logTimer);
        clearInterval(stateTimer);
        setState(fresh);
        setLog(readLiveLog());
        loadResult(fresh.ts);
        return;
      }

      // 检查进程存活
      const alive = isProcessAlive(fresh?.pid ?? null);
      if (!alive) {
        deadCount += 1;
        // 等待约 3 次（~4.5s）让 wrapper 写回 state，之后放弃
        if (deadCount >= 3) {
          clearInterval(logTimer);
          clearInterval(stateTimer);
          const finalFresh = readRunState();
          if (finalFresh && finalFresh.status !== "running") {
            setState(finalFresh);
            loadResult(finalFresh.ts);
          } else {
            // wrapper 未写回（被 kill 或崩溃），降级显示
            setState((prev) => ({ ...prev, status: "failed", exitCode: null, finishedAt: null }));
          }
          setLog(readLiveLog());
        }
      } else {
        deadCount = 0;
      }
    }, 1500);

    return () => {
      clearInterval(logTimer);
      clearInterval(stateTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在 mount 时注册一次轮询

  const exitSuffix = state.signal ? ` signal=${state.signal}` : "";
  const navTitle = running
    ? `🔄 ${isSync ? "sync " : ""}执行中`
    : state.exitCode === 0
      ? `✅ ${label}完成`
      : `❌ ${label}失败 (exit=${state.exitCode ?? "?"}${exitSuffix})`;

  const markdown = buildMarkdown({ state, log, running, result, failedSummary, failedStageName });

  return (
    <Detail
      isLoading={running}
      navigationTitle={navTitle}
      markdown={markdown}
      metadata={!isSync && result ? <ResultMetadata result={result} /> : undefined}
      actions={
        <ActionPanel>
          {running && (
            <>
              <Action
                title="刷新"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => {
                  setLog(readLiveLog());
                  const fresh = readRunState();
                  if (fresh) setState(fresh);
                }}
              />
              <Action
                title="中止执行 (SIGTERM)"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                onAction={() => killPid(state.pid)}
              />
            </>
          )}
          {!isSync && result && <LogDirActions result={result} />}
          {!running && (
            <Action.CopyToClipboard title="复制日志" content={log} icon={Icon.Clipboard} />
          )}
        </ActionPanel>
      }
    />
  );
}

// ── 辅助函数 ──────────────────────────────────────────────────────────────────

function killPid(pid: number | null) {
  if (!pid) return;
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* ignore */
    }
  }
}

// ── ResultMetadata ─────────────────────────────────────────────────────────────

function ResultMetadata({ result }: { result: ResultJson }) {
  const r = result.release;
  const iconMap: Record<StageStatus, string> = {
    ok: "✅",
    warn: "⚠️",
    failed: "❌",
    skipped: "⏭️",
    pending: "⏳",
  };
  const finalColor: Record<FinalStatus, string> = {
    ok: "🟢",
    ok_with_warn: "🟡",
    failed: "🔴",
    dry_run: "🧪",
    pending: "⏳",
  };
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="final_status"
        text={`${finalColor[result.final_status] ?? "?"} ${result.final_status}`}
      />
      <Detail.Metadata.Label
        title="版本"
        text={r.app_version ? `${r.app_version}(${r.build_number || "?"})` : "(未生成)"}
      />
      <Detail.Metadata.Label title="环境" text={r.api_environment || "?"} />
      <Detail.Metadata.Label title="App" text={r.app_name || r.bundle_id || "?"} />
      <Detail.Metadata.Separator />
      {result.stages.map((s) => (
        <Detail.Metadata.Label
          key={s.name}
          title={s.name}
          text={`${iconMap[s.status] ?? "?"} ${s.status} (${s.duration_sec}s)`}
        />
      ))}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="TS" text={result.ts} />
      <Detail.Metadata.Label title="log_dir" text={result.log_dir} />
    </Detail.Metadata>
  );
}

// ── LogDirActions ──────────────────────────────────────────────────────────────

function LogDirActions({ result }: { result: ResultJson }) {
  const logDir = absLogDir(result.ts);
  const resultPath = absResultJsonPath(result.ts);
  return (
    <>
      <Action title="在 Finder 中显示日志目录" icon={Icon.Finder} onAction={() => showInFinder(logDir)} />
      <Action title="打开日志目录" icon={Icon.Folder} onAction={() => open(logDir)} />
      <Action.CopyToClipboard title="复制 result.json 路径" content={resultPath} />
      <Action.CopyToClipboard title="复制日志目录路径" content={logDir} />
      {result.release.build_number > 0 && (
        <Action.CopyToClipboard title="复制 BUILD_NUMBER" content={String(result.release.build_number)} />
      )}
      {result.release.build_id && (
        <Action.CopyToClipboard title="复制 Build ID" content={result.release.build_id} />
      )}
    </>
  );
}

// ── buildMarkdown ──────────────────────────────────────────────────────────────

const MAX_LOG_CHARS = 200_000;

function buildMarkdown(args: {
  state: RunState;
  log: string;
  running: boolean;
  result: ResultJson | null;
  failedSummary: string | null;
  failedStageName: string | null;
}): string {
  const { state, log, running, result, failedSummary, failedStageName } = args;
  const isSync = state.stage === "sync";
  const label = isSync ? "sync" : "发布";
  const exitSuffix = state.signal ? ` signal=${state.signal}` : "";

  let md = "";

  // 标题
  if (running) {
    md += `## 🔄 ${isSync ? "sync " : ""}执行中\n\n`;
    if (!isSync) {
      md += `> ⏳ archive 通常需要 2–5 分钟。\n`;
      md += `> 关闭此视图不会中断任务（子进程已完全 detached，通过 wrapper 写日志文件）。\n`;
      md += `> 可随时用「Resume Current Release」命令恢复查看。按 ⌘R 手动刷新。\n\n`;
    }
  } else if (state.exitCode === 0) {
    md += `## ✅ ${label}完成\n\n`;
    if (state.finishedAt) md += `> 完成时间：${state.finishedAt}\n\n`;
  } else {
    md += `## ❌ ${label}失败 (exit=${state.exitCode ?? "?"}${exitSuffix})\n\n`;
    if (state.exitCode === null && !state.finishedAt) {
      md += `> ⚠️ 进程已退出，但 wrapper 未写回最终状态（可能被强制 kill）。\n\n`;
    }
  }

  // 运行参数摘要
  md += `**Stage**: \`${state.stage}\``;
  if (state.notes) md += `   **Notes**: ${state.notes}`;
  md += `\n\n**启动**: ${state.startedAt}`;
  if (state.ts) md += `   **TS**: \`${state.ts}\``;
  if (state.pid) md += `   **PID**: ${state.pid}`;
  md += `\n\n`;

  // sync 说明
  if (isSync) {
    md += `> 💡 \`sync\` 阶段不生成 \`result.json\`，不读取任何 TS 目录。\n\n`;
  }

  // 阶段状态表
  if (result && !isSync) {
    md += `### 阶段状态\n\n`;
    md += `| 阶段 | 状态 | 耗时 | 说明 |\n|---|---|---|---|\n`;
    const icon: Record<StageStatus, string> = {
      ok: "✅",
      warn: "⚠️",
      failed: "❌",
      skipped: "⏭️",
      pending: "⏳",
    };
    for (const s of result.stages) {
      const message = (s.message || "").replace(/\|/g, "\\|");
      md += `| ${s.name} | ${icon[s.status] ?? "?"} ${s.status} | ${s.duration_sec}s | ${message} |\n`;
    }
    md += `\n`;
  }

  // 失败摘要
  if (failedSummary && failedStageName && !isSync) {
    md += `### ${failedStageName} 失败摘要\n\n\`\`\`\n${failedSummary.trim()}\n\`\`\`\n\n`;
  }

  // 实时/历史日志
  const displayLog =
    log.length > MAX_LOG_CHARS
      ? "... [输出过长，仅保留末尾 200KB] ...\n" + log.slice(log.length - MAX_LOG_CHARS)
      : log;

  md += `### 终端输出\n\n\`\`\`\n${displayLog || "(暂无输出)"}\n\`\`\`\n`;
  return md;
}
