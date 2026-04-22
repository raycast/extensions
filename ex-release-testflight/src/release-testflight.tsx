import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  open,
  showInFinder,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { STAGES, STAGE_LABELS, Stage } from "./lib/config";
import { RunHandle, RunOptions, buildArgs, runScript } from "./lib/runScript";
import {
  FinalStatus,
  ResultJson,
  StageStatus,
  absLogDir,
  absResultJsonPath,
  readResultJson,
  readSummaryText,
  resolveTs,
} from "./lib/resultFile";

interface FormValues {
  stage: Stage;
  notes: string;
  notify: string;
  ts: string;
  force: boolean;
  dryRun: boolean;
  incremental: boolean;
}

// ---------------- 主表单 ----------------
export default function Command() {
  const { push } = useNavigation();

  async function handleSubmit(values: FormValues) {
    if ((values.stage === "all" || values.stage === "archive") && !values.notes.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "需要 Notes",
        message: `stage=${values.stage} 时 --notes 必填`,
      });
      return;
    }
    push(<ExecutionView values={values} />);
  }

  return (
    <Form
      navigationTitle="Release to TestFlight"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="执行发布" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="调用 scripts/release_testflight.sh,Raycast 仅做 UI;所有发布规则由 shell 决定。" />

      <Form.Dropdown id="stage" title="Stage" defaultValue="all">
        {STAGES.map((s) => (
          <Form.Dropdown.Item key={s} value={s} title={STAGE_LABELS[s]} />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="例:定投;跟单;交易记录修复"
        info="; 或 ； 分隔;stage=all/archive 时必填,其他 stage 可留空;sync 忽略"
      />

      <Form.TextField
        id="notify"
        title="Notify"
        placeholder="例:<@U12345> 或 <!subteam^S123|@ios-team>"
        info="Slack 消息末尾原样追加的一行(可空);sync 忽略"
        storeValue
      />

      <Form.TextField
        id="ts"
        title="TS"
        placeholder="留空 = 使用最新构建目录"
        info="形如 20260422_143000;仅 export/upload/inject/notify 子阶段会用;sync 忽略"
      />

      <Form.Separator />

      <Form.Checkbox
        id="force"
        label="--force  跳过非关键预检查(仅 Pods 一致性 / BUILD 漂移)"
        defaultValue={false}
      />
      <Form.Checkbox
        id="dryRun"
        label="--dry-run  只读模式(执行预检查与 ASC 只读查询,跳过 archive/export/upload/inject/notify)"
        defaultValue={false}
      />
      <Form.Checkbox id="incremental" label="--incremental  archive 阶段跳过 clean" defaultValue={false} />
    </Form>
  );
}

// ---------------- 执行视图 ----------------
function ExecutionView({ values }: { values: FormValues }) {
  const [runId, setRunId] = useState(0);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(true);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [exitSignal, setExitSignal] = useState<string | null>(null);
  const [result, setResult] = useState<ResultJson | null>(null);
  const [failedSummary, setFailedSummary] = useState<string | null>(null);
  const [failedStageName, setFailedStageName] = useState<string | null>(null);
  const [spawnError, setSpawnError] = useState<string | null>(null);

  const outputRef = useRef("");
  const handleRef = useRef<RunHandle | null>(null);

  const isSync = values.stage === "sync";
  const label = isSync ? "sync" : "发布";

  useEffect(() => {
    // 重置 UI 状态(strict mode 下会跑两次,但 setState 相同值时 React 会 bail out)
    outputRef.current = "";
    setOutput("");
    setExitCode(null);
    setExitSignal(null);
    setResult(null);
    setFailedSummary(null);
    setFailedStageName(null);
    setSpawnError(null);
    setRunning(true);

    // React 18 StrictMode 在 dev 模式下会同步双调用本 effect(mount → cleanup → mount)。
    // 如果直接在 effect 体内 spawn,会产生两个 bash 进程,互相写同一个 TS 目录,
    // 并产生"每行输出重复两次"的症状。
    //
    // 解决:把 spawn 延迟一个 tick(setTimeout 0)。
    //   - strict 第一次 mount:注册 timer,但立刻被 cleanup 的 canceled=true 标记失效;
    //   - strict 第二次 mount:注册新的 timer,浏览器 tick 到达时才真正 spawn。
    // 最终只有一个 bash 进程被启动。
    let canceled = false;
    let flushInterval: ReturnType<typeof setInterval> | null = null;

    const kickTimer = setTimeout(() => {
      if (canceled) return;

      const opts: RunOptions = {
        stage: values.stage,
        notes: values.notes,
        notify: values.notify,
        ts: values.ts,
        force: values.force,
        dryRun: values.dryRun,
        incremental: values.incremental,
      };

      const toast = showToast({
        style: Toast.Style.Animated,
        title: isSync ? "sync 执行中" : "执行中",
        message: describeArgs(opts),
      });

      // 输出节流:避免每条 stdout chunk 都 setState 触发 React 重渲染。
      let lastFlushedLen = 0;
      flushInterval = setInterval(() => {
        if (outputRef.current.length !== lastFlushedLen) {
          lastFlushedLen = outputRef.current.length;
          setOutput(outputRef.current);
        }
      }, 300);

      const handle = runScript(opts, (chunk) => {
        outputRef.current = appendWithLimit(outputRef.current, chunk);
      });
      handleRef.current = handle;

      handle.promise
        .then(async (res) => {
          if (flushInterval) clearInterval(flushInterval);
          setOutput(outputRef.current);
          setExitCode(res.exitCode);
          setExitSignal(res.signal);
          setRunning(false);

          let ts: string | null = null;
          if (!isSync) {
            ts = resolveTs(values.ts);
            if (ts) {
              const r = readResultJson(ts);
              setResult(r);
              if (r) {
                const failed = r.stages.find((s) => s.status === "failed");
                if (failed) {
                  setFailedStageName(failed.name);
                  const sum = readSummaryText(ts, failed.summary);
                  setFailedSummary(sum);
                }
              }
            }
          }

          const ok = res.exitCode === 0;
          const t = await toast;
          t.style = ok ? Toast.Style.Success : Toast.Style.Failure;
          t.title = ok ? `${label}完成` : `${label}失败`;
          t.message = isSync ? "sync 不产生 TS 目录" : ts ? `TS=${ts}` : undefined;
        })
        .catch(async (err) => {
          if (flushInterval) clearInterval(flushInterval);
          setOutput(outputRef.current);
          setRunning(false);
          setExitCode(-1);
          setSpawnError(String(err?.message ?? err));
          const t = await toast;
          t.style = Toast.Style.Failure;
          t.title = "调用失败";
          t.message = String(err?.message ?? err);
        });
    }, 0);

    return () => {
      // strict mode 第一次 cleanup:canceled=true,kickTimer 被 clearTimeout 取消,
      //   没有 spawn 发生,也没有 interval 需要清理。
      // 真正卸载的 cleanup:同上,若 spawn 已发生,清掉 interval 即可;
      //   **不** 自动 kill child —— 子进程已 detached,让 shell 跑完写出 result.json。
      canceled = true;
      clearTimeout(kickTimer);
      if (flushInterval) clearInterval(flushInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const markdown = renderMarkdown({
    stage: values.stage,
    output,
    running,
    exitCode,
    exitSignal,
    result,
    failedSummary,
    failedStageName,
    spawnError,
  });

  const exitSuffix = exitSignal ? ` signal=${exitSignal}` : "";
  const title = running
    ? `🔄 ${isSync ? "sync " : ""}执行中`
    : exitCode === 0
      ? `✅ ${label}完成`
      : `❌ ${label}失败 (exit=${exitCode ?? "?"}${exitSuffix})`;

  return (
    <Detail
      isLoading={running}
      navigationTitle={title}
      markdown={markdown}
      metadata={!isSync && result ? <ResultMetadata result={result} /> : undefined}
      actions={
        <ActionPanel>
          {!isSync && result && <LogDirActions result={result} />}
          {!running && (
            <Action
              title="重新运行同一组参数"
              icon={Icon.RotateClockwise}
              onAction={() => setRunId((n) => n + 1)}
            />
          )}
          {running && handleRef.current && (
            <Action
              title="中止执行(SIGTERM)"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              onAction={() => handleRef.current?.kill()}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

// ---------------- 结果侧栏 Metadata(仅非 sync 场景渲染) ----------------
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

// ---------------- 日志目录相关 Action(仅非 sync 场景) ----------------
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

// ---------------- 渲染辅助 ----------------
const MAX_STDOUT_CHARS = 200_000;

function appendWithLimit(current: string, chunk: string): string {
  const next = current + chunk;
  if (next.length <= MAX_STDOUT_CHARS) return next;
  const truncated = next.slice(next.length - MAX_STDOUT_CHARS);
  return "... [输出过长,仅保留末尾 200KB] ...\n" + truncated;
}

function describeArgs(opts: RunOptions): string {
  return ["bash scripts/release_testflight.sh", ...buildArgs(opts)].join(" ");
}

function renderMarkdown(args: {
  stage: Stage;
  output: string;
  running: boolean;
  exitCode: number | null;
  exitSignal: string | null;
  result: ResultJson | null;
  failedSummary: string | null;
  failedStageName: string | null;
  spawnError: string | null;
}): string {
  const { stage, output, running, exitCode, exitSignal, result, failedSummary, failedStageName, spawnError } = args;
  const isSync = stage === "sync";
  const label = isSync ? "sync" : "发布";
  const exitSuffix = exitSignal ? ` signal=${exitSignal}` : "";
  let md = "";

  if (running) {
    md += `## 🔄 ${isSync ? "sync " : ""}执行中\n\n`;
    if (!isSync) {
      md += `> ⏳ archive 阶段通常需要 2–5 分钟。视图短暂切走不会中止执行(子进程已 detached)。\n> 若要显式中止,使用 Action:"中止执行"。\n\n`;
    }
  } else if (exitCode === 0) {
    md += `## ✅ ${label}完成\n\n`;
  } else {
    md += `## ❌ ${label}失败 (exit=${exitCode ?? "?"}${exitSuffix})\n\n`;
    if (exitCode === null && exitSignal) {
      md += `> ⚠️ 子进程由信号 \`${exitSignal}\` 终止,非正常退出。\n`;
      if (exitSignal === "SIGTERM") {
        md += `> 常见来源:用户在 UI 点了"中止执行";或扩展被 Raycast 运行时回收。\n`;
        md += `> 本版已移除视图卸载自动 kill、并已 detached 子进程,理论上此情况应仅由显式操作触发。\n`;
      }
      md += `\n`;
    }
  }

  // sync 阶段显式提示:不生成 result.json,不读任何旧 TS
  if (isSync) {
    md += [
      "> 💡 `sync` 阶段按 shell 契约 **不生成 `result.json`**,本视图**不会**读取任何 TS 目录。",
      "> 以下为本次 `sync` 的原始 stdout/stderr(即 ASC 与 Config 的 BUILD_NUMBER diff)。",
      "> 若确认要把 ASC 最新 build 号写回 `Config.xcconfig`,请在终端手动执行:",
      "> `python3 scripts/sync_build_number.py --apply`(本入口永不自动 apply)。",
      "",
      "",
    ].join("\n");
  }

  if (spawnError) {
    md += `### spawn 调用错误\n\n\`\`\`\n${spawnError}\n\`\`\`\n\n`;
  }

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

  if (failedSummary && failedStageName && !isSync) {
    md += `### ${failedStageName} 失败摘要\n\n\`\`\`\n${failedSummary.trim()}\n\`\`\`\n\n`;
  }

  md += `### 终端输出\n\n\`\`\`\n${output || "(暂无输出)"}\n\`\`\`\n`;
  return md;
}
