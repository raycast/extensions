import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { STAGES, STAGE_LABELS, Stage } from "./lib/config";
import { RunOptions, buildArgs, runScript } from "./lib/runScript";
import { LIVE_LOG_FILE, RunState, writeRunState } from "./lib/runState";
import { LivePollView } from "./lib/LivePollView";

interface FormValues {
  stage: Stage;
  notes: string;
  notify: string;
  ts: string;
  force: boolean;
  dryRun: boolean;
  incremental: boolean;
}

export default function Command() {
  const { push } = useNavigation();

  async function handleSubmit(values: FormValues) {
    // 校验：archive / all 必须有 notes
    if ((values.stage === "all" || values.stage === "archive") && !values.notes.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "需要 Notes",
        message: `stage=${values.stage} 时 --notes 必填`,
      });
      return;
    }

    const opts: RunOptions = {
      stage: values.stage,
      notes: values.notes,
      notify: values.notify,
      ts: values.ts,
      force: values.force,
      dryRun: values.dryRun,
      incremental: values.incremental,
    };

    // 启动 wrapper（完全 detached，不依赖前台进程存活）
    // runScript 会先校验 iOS Repo Root preference;校验失败抛 Error。
    let handle;
    try {
      handle = runScript(opts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await showToast({
        style: Toast.Style.Failure,
        title: "配置错误",
        message,
      });
      return;
    }

    // 写入初始 state（wrapper 结束后会自行覆写最终状态）
    const initialState: RunState = {
      pid: handle.pid,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      stage: values.stage,
      args: buildArgs(opts),
      ts: values.ts?.trim() || null,
      logPath: LIVE_LOG_FILE,
      status: "running",
      exitCode: null,
      signal: null,
      notes: values.notes,
    };
    writeRunState(initialState);

    const isSync = values.stage === "sync";
    showToast({
      style: Toast.Style.Animated,
      title: isSync ? "sync 已启动" : "发布已启动（后台执行）",
      message: `PID ${handle.pid ?? "?"} · 日志 → ${LIVE_LOG_FILE}`,
    });

    push(<LivePollView state={initialState} />);
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
      <Form.Description text="调用 scripts/release_testflight.sh；Raycast 仅做 UI，所有发布规则由 shell 决定。" />

      <Form.Dropdown id="stage" title="Stage" defaultValue="all">
        {STAGES.map((s) => (
          <Form.Dropdown.Item key={s} value={s} title={STAGE_LABELS[s]} />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="例：定投;跟单;交易记录修复"
        info="; 或 ； 分隔；stage=all/archive 时必填，其他 stage 可留空；sync 忽略"
      />

      <Form.TextField
        id="notify"
        title="Notify"
        placeholder="例：<@U12345> 或 <!subteam^S123|@ios-team>"
        info="Slack 消息末尾追加的一行（可空）；sync 忽略"
        storeValue
      />

      <Form.TextField
        id="ts"
        title="TS"
        placeholder="留空 = 使用最新构建目录"
        info="形如 20260422_143000；仅 export/upload/inject/notify 子阶段会用；sync 忽略"
      />

      <Form.Separator />

      <Form.Checkbox
        id="force"
        label="--force  跳过非关键预检查（仅 Pods 一致性 / BUILD 漂移）"
        defaultValue={false}
      />
      <Form.Checkbox
        id="dryRun"
        label="--dry-run  只读模式（执行预检查与 ASC 只读查询，跳过 archive/export/upload/inject/notify）"
        defaultValue={false}
      />
      <Form.Checkbox id="incremental" label="--incremental  archive 阶段跳过 clean" defaultValue={false} />
    </Form>
  );
}
