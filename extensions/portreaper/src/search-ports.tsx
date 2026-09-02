/**
 * Portreaper 的 Raycast 前端。
 *
 * 与桌面版的分工：这里是「快速处置」——找到残留、一键终止、加星豁免。判定的
 * 完整解释（证据链、启动链、豁免理由的双语文案）留给桌面版的详情面板。
 *
 * 关于理由为什么显示成 `ppid1_orphan` 这样的机器码：翻译属于「表达」，是前端的
 * 事；而桌面版的文案住在 `src/i18n.ts`，那个模块在顶层访问 localStorage /
 * navigator，Node 环境 import 不进来。与其为 Raycast 复制第二份文案（第二份真相
 * 源 + 第二条漂移路径），不如诚实地显示引擎的原始判定码 —— 本扩展的用户是开发者，
 * `ppid1_orphan` 比一句含糊的翻译更有信息量。
 *
 * 同一条原则约束着本文件的每个分支：**行的外观只能由引擎发出的结构化字段驱动**
 * （`confidence` / `is_zombie_suspect` / `ports` / `duplicate_of` / `state`），
 * 绝不按 `zombie_reasons` 里的具体码名分叉 —— `scripts/check-reason-parity.mjs`
 * 不覆盖本目录，在这里手抄一份码名就是一条没有守卫的漂移路径。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  showToast,
} from "@raycast/api";

import {
  CliNotFoundError,
  CliOutputError,
  ScanFailedError,
  SchemaMismatchError,
  type Confidence,
  type Platform,
  type ProcessEntry,
  type ScanReport,
  KillFailedError,
  isSameProcess,
  kill,
  resolveCliPath,
  scan,
  searchedLocations,
  verifyCli,
  whitelist,
  whitelistKey,
} from "./cli";
import {
  ChecksumMismatchError,
  DownloadFailedError,
  UnsupportedPlatformError,
  installCliOnce,
  installedCliPath,
} from "./install";

type State =
  | { kind: "loading" }
  | { kind: "installing"; step: string }
  | { kind: "ready"; cliPath: string; platform: Platform; entries: ProcessEntry[] }
  // downloadError：走到引导页的原因是「下载没成功」而不是「哪儿都没找到」。
  // 两者的用户处境不同（前者该看网络，后者该看安装），引导页据此换措辞。
  | { kind: "no-cli"; searched: string[]; downloadError?: string }
  // title 与 message 分开：这个分支承载四种完全不同的处境（平台不支持 / 校验和
  // 不匹配这种**安全事件** / 引擎与扩展不同代 / 真的扫描失败），全部顶着一句
  // "Scan failed" 会把安全事件伪装成一次普通故障。
  | { kind: "error"; title: string; message: string };

const CONFIDENCE_COLOR: Record<Confidence, Color> = {
  confirmed: Color.Red,
  likely: Color.Orange,
  possible: Color.Yellow,
  none: Color.SecondaryText,
};

/** 终止后的存活确认：多久开始探、每隔多久探一次、最多探到什么时候。
 *  250ms 的首次延迟与桌面版对齐（`src/App.tsx` 的 kill 后 sleep）；2.5s 上限
 *  是因为 vite / next 收到 SIGTERM 后关 HTTP keep-alive、停 esbuild service
 *  常要 0.3–2s，过早宣布「还活着」会变成一片误报。 */
const CONFIRM_FIRST_DELAY_MS = 250;
const CONFIRM_POLL_MS = 300;
const CONFIRM_DEADLINE_MS = 2500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 终止后确认的三态。`unknown` 是必要的第三档 —— 见 `confirmTermination`。 */
type ConfirmResult = { kind: "gone" } | { kind: "alive"; row: ProcessEntry } | { kind: "unknown" };

/** 判定维筛选（搜索栏右侧的 Dropdown）。文本搜索管「哪一个」，它管「哪一类」。 */
type VerdictFilter =
  | "all"
  | "suspects"
  | "confirmed"
  | "likely"
  | "possible"
  | "starred"
  | "healthy";

/** UI 全程以 `:5173` 展示端口 —— 与桌面版 `src/model.ts formatPorts` 同口径，
 *  也与 `matchesQuery` 允许用户原样粘贴 `:5173` 搜索这件事互为表里。 */
export function formatPorts(ports: number[]): string {
  return ports.map((p) => `:${p}`).join(" ");
}

/**
 * 一行是否命中搜索词。语义与桌面版 `src/App.tsx` 的过滤保持一致
 * （含 `:5173` 这种可原样复制粘贴的端口写法）——两处都是**展示层**过滤，
 * 不涉及判定，故允许各自实现；改一边时请顺手看另一边。
 *
 * 刻意用子串匹配而非 Raycast 内建的模糊匹配：本命令的搜索对象是端口号与 PID，
 * 模糊匹配会让 "517" 命中 pid 5170321 之类的无关行，对数字场景是负收益。
 */
export function matchesQuery(e: ProcessEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  // UI 全程以 ":5173" 展示端口 —— 用户原样复制粘贴也要能搜到
  const portQ = q.startsWith(":") ? q.slice(1) : q;
  return (
    e.app_label.toLowerCase().includes(q) ||
    e.command.toLowerCase().includes(q) ||
    e.full_command.toLowerCase().includes(q) ||
    e.app_category.toLowerCase().includes(q) ||
    // launcher_label：桌面版搜 "iterm" 能找出「由 iTerm 启动的那些行」，
    // 这里曾漏掉，两侧的匹配面因此静默分叉
    e.launcher_label.toLowerCase().includes(q) ||
    (portQ !== "" && e.ports.some((p) => String(p).includes(portQ))) ||
    String(e.pid).includes(q)
  );
}

/** 进程被挂起（ps state 含 `T`）—— Ctrl-Z、后台作业读终端（SIGTTIN）、
 *  `stty tostop` 下写终端（SIGTTOU）都会进这个态。它对本产品是关键状态：
 *  **被捕获的 SIGTERM 在进程恢复运行前不会被处理**，所以引擎在温和终止后会
 *  补一发 SIGCONT 把它唤醒（`crates/portreaper-core/src/platform.rs`）。 */
function isStopped(e: ProcessEntry): boolean {
  return e.state.includes("T");
}

export function matchesVerdict(e: ProcessEntry, filter: VerdictFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "suspects":
      return e.is_zombie_suspect;
    case "confirmed":
    case "likely":
    case "possible":
      return e.is_zombie_suspect && e.confidence === filter;
    case "starred":
      return e.is_whitelisted;
    case "healthy":
      return !e.is_zombie_suspect && !e.is_whitelisted;
  }
}

export default function SearchPorts() {
  const [state, setState] = useState<State>({ kind: "loading" });
  // 默认展开详情：本工具的卖点是「为什么判它是残留」，藏起证据就只剩一个端口列表。
  const [showDetail, setShowDetail] = useState(true);
  // 自己接管过滤（List 的 filtering={false}）：内建过滤只隐藏 item，分区标题的
  // 计数仍由扩展按全量 entries 算，于是搜索时会出现「筛出 3 行却写着 Healthy 12」
  // 的自相矛盾（真机 QA 发现）。把过滤前移到分桶之前，计数与条目就恒等一致。
  const [searchText, setSearchText] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  // 「正在重扫」与「还没有任何数据」是两回事：前者要在保留旧列表的同时给出进度
  // 反馈。此前刷新期间 isLoading 恒 false，「刷过了但那行还在」和「压根没刷」
  // 在屏幕上完全一样 —— 这正是用户报告「终止了没反应」的观感来源之一。
  const [busy, setBusy] = useState(true);
  // 单调递增的请求号：load() 可重入（连点 Refresh、终止后自动刷新），
  // 没有它先发后返的旧结果会覆盖新结果。
  const reqId = useRef(0);

  /** 解析路径 → 必要时自愈下载 → verify → scan。返回本轮 entries（被更新的一轮
   *  取代、或失败时返回 null）。**调用方拿它做终止后的存活确认**，所以必须返回
   *  数据而不是只写 state。 */
  const load = useCallback(async (): Promise<ProcessEntry[] | null> => {
    const myId = ++reqId.current;
    const stale = () => myId !== reqId.current;
    setBusy(true);
    const prefs = getPreferenceValues<Preferences.SearchPorts>();
    const supportPath = environment.supportPath;
    const searched = searchedLocations(prefs.cliPath, supportPath);
    try {
      // 单飞：load() 可重入，两轮同时走到恢复分支时共用同一次下载（见 install.ts）。
      const install = () =>
        installCliOnce(supportPath, (step) => {
          if (!stale()) setState({ kind: "installing", step });
        });

      let cliPath = resolveCliPath(prefs.cliPath, supportPath);
      if (cliPath === null) {
        // 首次使用：自己把引擎取回来。Raycast Store 不允许把安装工作丢给用户，
        // 允许的是「从可信源下载 + 校验完整性」——见 install.ts。
        if (!stale()) setState({ kind: "installing", step: "Preparing…" });
        cliPath = await install();
      }
      try {
        await verifyCli(cliPath, searched);
      } catch (e) {
        // 托管副本跑不起来（下载被截断、换过架构、执行位丢了）时重取一份覆盖 ——
        // 否则扩展会卡死在「找不到 CLI」，而引导页明明写着我们会重新下载。
        // 只对**我们自己下载的那份**这么做：用户在偏好里显式指定的路径不擅自动。
        // 不先删旧副本：installCli 以 rename 原子覆盖，删除只会制造一个「磁盘上没有
        // CLI」的窗口，并发的另一轮 load 会在这个窗口里撞上 ENOENT（评审发现）。
        if (cliPath !== installedCliPath(supportPath)) throw e;
        if (!stale()) setState({ kind: "installing", step: "Replacing an unusable copy…" });
        cliPath = await install();
        await verifyCli(cliPath, searched);
      }
      let report: ScanReport;
      try {
        report = await scan(cliPath);
      } catch (e) {
        // 托管副本能跑但 schema 与本扩展对不上：`verifyCli` 只跑 --version，
        // 陈旧二进制照样通过，要到 scan 才被拒。此时 Retry 会一次次选中同一份，
        // 用户视角是死循环。取一份最新的再试 —— 与上面「换掉不可用副本」同一套路。
        //
        // 只换**我们自己下载的那份**（用户显式指定的路径不擅自动），且**只换一次**：
        // 新下的仍对不上，说明扩展与已发布的 CLI 确实不同代，那是真错误，
        // 必须如实报给用户，绝不无限重下。同样不先删旧副本，理由见上。
        if (!(e instanceof SchemaMismatchError)) throw e;
        if (cliPath !== installedCliPath(supportPath)) throw e;
        if (!stale()) setState({ kind: "installing", step: "Updating the engine…" });
        cliPath = await install();
        await verifyCli(cliPath, searched);
        report = await scan(cliPath);
      }
      if (stale()) return null;
      setState({ kind: "ready", cliPath, platform: report.platform, entries: report.entries });
      return report.entries;
    } catch (e) {
      if (!stale()) setState(errorState(e, searched));
      return null;
    } finally {
      if (!stale()) setBusy(false);
    }
  }, []);

  // 只在首次挂载时扫描；后续刷新走 Action（避免每次渲染都 spawn 一个进程）
  useEffect(() => {
    void load();
  }, [load]);

  const entries = state.kind === "ready" ? state.entries : [];
  const cliPath = state.kind === "ready" ? state.cliPath : "";
  const platform: Platform = state.kind === "ready" ? state.platform : "unknown";

  // 分组与桌面版一致：疑似 → 收藏 → 其余。引擎已按「疑似优先 + 置信度」排好序，
  // 这里只做分桶，不再二次排序（排序规则属于引擎，前端重排会与桌面版视觉不一致）。
  // 先过滤再分桶 —— 分区计数取自各桶长度，因此与实际渲染的行数恒等。
  //
  // 疑似再按置信度拆三段：三档的差别是产品的核心主张（「引擎有多确信这是残留」），
  // 挤在一个 Section 里就只剩两个颜色相近的小 tag 在承载它。**拆桶不是排序**，
  // 桶内顺序原样保留引擎给的次序。
  const buckets = useMemo(() => {
    const visible = entries.filter(
      (e) => matchesQuery(e, searchText) && matchesVerdict(e, verdictFilter),
    );
    const suspects = visible.filter((e) => e.is_zombie_suspect);
    return {
      visible,
      confirmed: suspects.filter((e) => e.confidence === "confirmed"),
      likely: suspects.filter((e) => e.confidence === "likely"),
      possible: suspects.filter((e) => e.confidence === "possible"),
      starred: visible.filter((e) => e.is_whitelisted),
      healthy: visible.filter((e) => !e.is_zombie_suspect && !e.is_whitelisted),
    };
  }, [entries, searchText, verdictFilter]);

  const onToggleDetail = useCallback(() => setShowDetail((v) => !v), []);

  const shared = useMemo(
    () => ({ cliPath, platform, onChanged: load, showDetail, onToggleDetail }),
    [cliPath, platform, load, showDetail, onToggleDetail],
  );

  if (state.kind === "installing") {
    // 刻意**不用** `List.EmptyView`：官方文档明写「isLoading 为真且搜索框为空时
    // EmptyView 永远不显示」，而首次使用恰好正是这两个条件同时成立的时刻 ——
    // 那段「正在从 GitHub 取引擎并校验 SHA-256」的解释一个字都渲染不出来，
    // 用户只看到一条空白进度条卡十几秒。改用 List.Item（引导页早就是这么绕的）。
    return (
      <List isLoading isShowingDetail searchBarPlaceholder="Setting up…">
        <List.Item
          icon={Icon.Download}
          title="Setting up Portreaper CLI"
          subtitle={state.step}
          detail={
            <List.Item.Detail
              markdown={[
                "# Setting up Portreaper CLI",
                "",
                `**${state.step}**`,
                "",
                "The extension drives the same classification engine as the Portreaper desktop",
                "app. It downloads that engine from the project's GitHub release and verifies its",
                "SHA-256 checksum before running it. This happens once.",
                "",
                "The checksum is verified in memory before anything is written to disk.",
              ].join("\n")}
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open Releases Page"
                url="https://github.com/fanhefeng/portreaper/releases/latest"
              />
              <Action.CopyToClipboard
                title="Copy Build Command"
                content="cargo build --release -p portreaper-cli"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  if (state.kind === "no-cli") {
    return (
      <NotFoundView
        searched={state.searched}
        downloadError={state.downloadError}
        busy={busy}
        onRetry={load}
      />
    );
  }
  if (state.kind === "error") {
    return (
      // isLoading 必须接上：Retry 之后 scan 最长 20s，没有它这段时间零反馈
      <List isLoading={busy}>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title={state.title}
          description={state.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={load} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const nothingAtAll = !busy && entries.length === 0;
  const filteredToNothing = !busy && entries.length > 0 && buckets.visible.length === 0;

  return (
    <List
      isLoading={busy}
      isShowingDetail={showDetail && buckets.visible.length > 0}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name, :port, or PID"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by verdict"
          storeValue
          onChange={(v) => setVerdictFilter(v as VerdictFilter)}
        >
          {/* 默认 All：若默认只看疑似，一台干净的机器打开就是空列表，
              第一印象会被当成扫描失败 */}
          <List.Dropdown.Item title="All" value="all" icon={Icon.List} />
          <List.Dropdown.Section title="Suspects">
            <List.Dropdown.Item
              title="All Suspects"
              value="suspects"
              icon={{ source: Icon.Warning, tintColor: Color.Red }}
            />
            <List.Dropdown.Item
              title="Confirmed"
              value="confirmed"
              icon={{ source: Icon.CircleFilled, tintColor: Color.Red }}
            />
            <List.Dropdown.Item
              title="Likely"
              value="likely"
              icon={{ source: Icon.CircleFilled, tintColor: Color.Orange }}
            />
            <List.Dropdown.Item
              title="Possible"
              value="possible"
              icon={{ source: Icon.CircleFilled, tintColor: Color.Yellow }}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section>
            <List.Dropdown.Item
              title="Starred"
              value="starred"
              icon={{ source: Icon.Star, tintColor: Color.Yellow }}
            />
            <List.Dropdown.Item
              title="Healthy"
              value="healthy"
              icon={{ source: Icon.CircleFilled, tintColor: Color.Green }}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <Section title="Confirmed" note="orphaned" entries={buckets.confirmed} {...shared} />
      <Section title="Likely" note="likely orphaned" entries={buckets.likely} {...shared} />
      <Section title="Possible" note="weak signal" entries={buckets.possible} {...shared} />
      <Section title="Starred" note="exempt" entries={buckets.starred} {...shared} />
      <Section
        title="Healthy"
        note="a live launcher owns these"
        entries={buckets.healthy}
        {...shared}
      />
      {nothingAtAll && (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="Nothing is listening"
          description="No listening processes and no orphaned dev processes."
        />
      )}
      {/* 接管过滤后「搜索无结果」也得自己兜：内建过滤会渲染 Raycast 的
          No Results 页，filtering={false} 之后那页不再出现，缺了就是一片空白。 */}
      {filteredToNothing && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches"
          description={
            searchText.trim()
              ? `Nothing matches “${searchText.trim()}”. Try a port like :5173, a PID, or part of the process name.`
              : "No process matches this verdict filter. Switch the dropdown back to All."
          }
        />
      )}
    </List>
  );
}

/** 顶层 catch 到的异常 → 错误页/引导页的 state。四种处境四种标题：
 *  校验和不匹配是**安全事件**，不能和一次普通的扫描故障共用一句 "Scan failed"。 */
function errorState(e: unknown, searched: string[]): State {
  if (e instanceof CliNotFoundError) {
    // verifyCli 把真正的原因（Exec format error / Permission denied / 超时）
    // 塞在 cause 里 —— 引导页只列路径清单的话，那条唯一的线索就被丢掉了
    const cause = e.cause instanceof Error ? e.cause.message : undefined;
    return { kind: "no-cli", searched: e.searched, downloadError: cause };
  }
  if (e instanceof DownloadFailedError) {
    // 断网 / 代理 / release 404：**必须**落到引导页，不能只甩一句 fetch failed。
    // 这是首次使用的默认失败路径，用户手里还没有引擎，错误页里得有出口。
    return { kind: "no-cli", searched, downloadError: e.detail };
  }
  if (e instanceof UnsupportedPlatformError) {
    return {
      kind: "error",
      title: "Unsupported Platform",
      message: `${e.message}. Portreaper ships macOS (arm64/x64) and Windows x64 builds only.`,
    };
  }
  if (e instanceof ChecksumMismatchError) {
    // 校验不过绝不退化成「那就直接用吧」——这是安全边界，不是体验问题。
    return {
      kind: "error",
      title: "Checksum Verification Failed",
      message:
        "The downloaded engine failed its SHA-256 check and was discarded. " +
        "Check your network (a proxy may be rewriting the download) and retry.",
    };
  }
  if (e instanceof SchemaMismatchError) {
    return {
      kind: "error",
      title: "Engine Version Mismatch",
      message: `${e.message}. Update this extension (or the CLI) so both speak the same contract.`,
    };
  }
  if (e instanceof CliOutputError) {
    return {
      kind: "error",
      title: "Not a Portreaper Engine",
      message:
        `${e.message}. Check the “Portreaper CLI Path” preference — ` +
        `it ran, but printed: ${e.sample.trim() || "(nothing)"}`,
    };
  }
  if (e instanceof ScanFailedError) {
    return {
      kind: "error",
      title: "Scan Failed",
      message:
        "portreaper-cli did not complete the scan. It may be outdated, blocked, or timing out — " +
        "reinstall it from the extension’s setup screen. Full details are in the extension console.",
    };
  }
  // 兜底：到这里的都不是已知形态（CLI 子进程那条已经被 ScanFailedError 收口，
  // 中文 stderr 不会再流到这里）。**这里确实会显示原始 message**，刻意如此：
  // 未知错误连一句可搜索的线索都不给，用户就只能报「它坏了」。原文同时进 console。
  console.error("portreaper: unrecognized scan error:", e);
  return {
    kind: "error",
    title: "Scan Failed",
    message: e instanceof Error ? e.message : String(e),
  };
}

type SharedProps = {
  cliPath: string;
  /** ScanReport.platform —— Windows 上动作布局要跟桌面版的产品决定对齐 */
  platform: Platform;
  /** 重扫并返回本轮 entries（终止后的存活确认要用它） */
  onChanged: () => Promise<ProcessEntry[] | null>;
  showDetail: boolean;
  onToggleDetail: () => void;
};

function Section(props: { title: string; note: string; entries: ProcessEntry[] } & SharedProps) {
  const { title, note, entries, ...shared } = props;
  if (entries.length === 0) return null;
  return (
    <List.Section title={title} subtitle={`${entries.length} · ${note}`}>
      {entries.map((e) => (
        <Row key={e.pid} entry={e} {...shared} />
      ))}
    </List.Section>
  );
}

/**
 * 行图标：**形状表示这是哪一类残留，着色表示引擎有多确信**。
 *
 * 此前只有 `ExclamationMark` / `CircleFilled` 两个无着色图标，把七种状态压成
 * 二值 —— 而「哪些是孤儿、哪些是被挂起的、哪些只是重复实例」恰恰是本产品要
 * 回答的问题。分支只读结构化字段，不看 `zombie_reasons` 的具体码名（见文件头）。
 */
function rowIcon(e: ProcessEntry): { source: Icon; tintColor: Color } {
  const tint = CONFIDENCE_COLOR[e.confidence];
  // 星标优先：这是用户自己下的判断，压过引擎的一切结论
  if (e.is_whitelisted) return { source: Icon.Star, tintColor: Color.Yellow };
  if (!e.is_zombie_suspect) return { source: Icon.CircleFilled, tintColor: Color.Green };
  // 被挂起：温和终止对它是「信号挂起待投递」，是最需要一眼认出的形态
  if (isStopped(e)) return { source: Icon.Pause, tintColor: tint };
  // 无端口的孤儿开发进程 —— 端口扫描看不见它们，是本产品的第二条扫描路径
  if (e.ports.length === 0) return { source: Icon.LivestreamDisabled, tintColor: tint };
  if (e.duplicate_of !== null) return { source: Icon.Duplicate, tintColor: tint };
  return { source: Icon.Warning, tintColor: tint };
}

function Row({ entry, ...shared }: { entry: ProcessEntry } & SharedProps) {
  // 端口是这一行的身份；没有端口的孤儿则退回命令行（那才是它的辨识依据）
  const subtitle = entry.ports.length > 0 ? formatPorts(entry.ports) : entry.command;
  const accessories: List.Item.Accessory[] = [];

  // 官方建议：详情面板打开时**不要挂任何 accessory**。列表列此时只剩约 40% 宽，
  // 最先被挤掉的正是用户用来认出「这是哪个项目」的 title —— 实跑验证过：哪怕只
  // 留一个置信度徽标，行标题也已经被截成 "api-gate…"。这一档的置信度由图标着色
  // 承载（rowIcon），完整判定在右侧 Metadata 的 Verdict 一行。
  if (!shared.showDetail) {
    if (isStopped(entry)) {
      accessories.push({
        tag: { value: "stopped", color: Color.Purple },
        tooltip: "Suspended (Ctrl-Z / SIGTTIN). Terminating resumes it so it can shut down.",
      });
    }
    if (entry.ports.length === 0) {
      accessories.push({
        tag: { value: "no port", color: Color.SecondaryText },
        tooltip: "Holds no port — listed because it looks like leftover dev tooling.",
      });
    }
    if (entry.duplicate_of !== null) {
      accessories.push({
        tag: { value: `dup of ${entry.duplicate_of}`, color: Color.Blue },
        tooltip:
          "Another instance of the same dev server is running — Portreaper never sweeps these.",
      });
    }
    // 置信度徽标的门控是 `confidence`，不是 `is_zombie_suspect`：星标行的
    // `is_zombie_suspect` 被引擎强制置 false，但 confidence / zombie_reasons 照常
    // 发出 —— 用户有权知道「我豁免掉的这条，引擎其实判它 confirmed」。
    if (entry.confidence !== "none") {
      accessories.push({
        tag: {
          value: entry.confidence,
          color: entry.is_whitelisted ? Color.SecondaryText : CONFIDENCE_COLOR[entry.confidence],
        },
        tooltip: entry.is_whitelisted
          ? `Exempt by your star — the engine's verdict was ${entry.confidence}`
          : `Verdict: ${entry.confidence} — ${entry.zombie_reasons.join(", ")}`,
      });
    }
    // 子树 CPU 而非行内 CPU：headless 浏览器把 CPU 全烧在子进程里，
    // 主进程读数是 ~0%（这正是桌面版 cpu_percent_tree 存在的原因）
    if (Number.isFinite(entry.cpu_percent_tree) && entry.cpu_percent_tree >= 1) {
      accessories.push({
        text: `${entry.cpu_percent_tree.toFixed(0)}%`,
        tooltip: "CPU of the whole process tree",
      });
    }
    accessories.push({
      text: `pid ${entry.pid}`,
      tooltip: `Uptime ${formatUptime(entry.elapsed_secs)}`,
    });
  }

  return (
    <List.Item
      // Raycast 的 id 决定「刷新后高亮停在哪一行」。不给它就按位置记忆，
      // 而下一个按键很可能是破坏性动作 —— 必须钉在**进程**而不是**位置**上。
      id={String(entry.pid)}
      icon={{ value: rowIcon(entry), tooltip: rowTooltip(entry) }}
      title={entry.app_label || entry.command}
      subtitle={subtitle}
      accessories={accessories}
      // 不再声明 keywords：过滤已由 matchesQuery 接管（List filtering={false}），
      // 留着会让人以为搜索命中范围由这里定义 —— 实际它已被忽略。
      detail={shared.showDetail ? <Detail entry={entry} /> : undefined}
      actions={<Actions entry={entry} {...shared} />}
    />
  );
}

function rowTooltip(e: ProcessEntry): string {
  if (e.is_whitelisted) return "Starred — exempt from suspicion";
  if (!e.is_zombie_suspect) return "Healthy — a live launcher owns this process";
  return `${e.confidence}: ${e.zombie_reasons.join(", ")}`;
}

/**
 * 把一段任意文本放进围栏代码块。
 *
 * 进程的完整命令行来自外部，含 `` ` `` / `*` / `#` / `[](…)` 时会破坏整段
 * markdown 渲染，甚至画出可点击的链接（一个 `--define:__VERSION__=1` 就够）。
 * 围栏块内部不解析 markdown，且会折行 —— 一举解决转义与「上百字符被截断」。
 * 围栏长度按内容里最长的反引号串加一，内容自带 ``` 也压不垮它。
 */
function fenced(text: string): string {
  const longest = (text.match(/`+/g) ?? []).reduce((n, s) => Math.max(n, s.length), 0);
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}\n${text}\n${fence}`;
}

function Detail({ entry }: { entry: ProcessEntry }) {
  const chain = entry.parent_chain.map((p) => `${p.label} (${p.pid})`).join(" → ");
  const md = [
    "## Command",
    "",
    fenced(entry.full_command || entry.command),
    "",
    ...(isStopped(entry)
      ? [
          "> **This process is stopped** (Ctrl-Z, or a background job touching the terminal).",
          "> A plain terminate signal stays pending until it resumes, so Portreaper wakes it",
          "> up right after sending one. If it still refuses to exit, use Force Kill.",
          "",
        ]
      : []),
    "## Launcher chain",
    "",
    chain ? fenced(chain) : "_No live ancestor — this process was reparented to init._",
  ].join("\n");

  return (
    <List.Item.Detail
      markdown={md}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Verdict">
            <List.Item.Detail.Metadata.TagList.Item
              text={entry.is_whitelisted ? `${entry.confidence} (starred)` : entry.confidence}
              color={
                entry.is_whitelisted ? Color.SecondaryText : CONFIDENCE_COLOR[entry.confidence]
              }
            />
          </List.Item.Detail.Metadata.TagList>
          {entry.zombie_reasons.length > 0 && (
            // 判定理由**只着色、不翻译** —— 文字保持引擎发出的原始码。
            // 在这里写一份英文释义就是第二份真相源，正是 core 拆分要根除的东西；
            // 完整解释留给桌面版的详情面板（那里的双语文案有 parity 守卫）。
            <List.Item.Detail.Metadata.TagList title="Why it is listed">
              {entry.zombie_reasons.map((r) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={r}
                  text={r}
                  color={CONFIDENCE_COLOR[entry.confidence]}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="PID" text={String(entry.pid)} />
          <List.Item.Detail.Metadata.Label
            title="State"
            text={isStopped(entry) ? `${entry.state} · stopped` : entry.state || "—"}
          />
          <List.Item.Detail.Metadata.Label title="Category" text={entry.app_category} />
          <List.Item.Detail.Metadata.Label
            title="Ports"
            text={entry.ports.length > 0 ? formatPorts(entry.ports) : "none"}
          />
          <List.Item.Detail.Metadata.Label title="Uptime" text={formatUptime(entry.elapsed_secs)} />
          <List.Item.Detail.Metadata.Label
            title="CPU (self / tree)"
            text={`${pct(entry.cpu_percent)} / ${pct(entry.cpu_percent_tree)}`}
          />
          <List.Item.Detail.Metadata.Label title="Memory" text={mb(entry.mem_mb)} />
          <List.Item.Detail.Metadata.Label title="User" text={entry.user || "—"} />
          <List.Item.Detail.Metadata.Label title="Executable" text={entry.exe_path || "—"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function Actions({
  entry,
  cliPath,
  platform,
  onChanged,
  onToggleDetail,
}: { entry: ProcessEntry } & SharedProps) {
  const label = entry.app_label || entry.command;

  /**
   * 终止流程。这里的关键设计是**不把「信号送出去了」当成「进程死了」**。
   *
   * `libc::kill` 返回 0 只代表信号已投递；捕获了 SIGTERM 却迟迟不退出（vite 关
   * keep-alive、esbuild service 卡住）、或被主管进程立刻重启的进程，照样会让
   * 这次调用成功返回。此前扩展在那之后直接弹绿色 "Terminated"，并且**永不纠正**
   * —— 用户看到的就是「提示成功、进程还在」。现在改成送出信号后短时轮询确认，
   * 仍在则如实报告并就地给出 Force Kill 的出口。
   */
  async function doKill(force: boolean) {
    // 没有身份令牌就不该走到这里（引擎会 fail-closed 拒绝）——但提前挡住，
    // 给出的提示比引擎的通用错误更有指导性。
    const startUnix = entry.start_unix;
    if (startUnix == null) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No identity token",
        message: "Refresh the list first — killing without one is refused by design.",
      });
      return;
    }
    const stopped = isStopped(entry);
    const ok = await confirmAlert({
      title: `Terminate ${label}?`,
      message: [
        `PID ${entry.pid}`,
        entry.ports.length ? `port ${formatPorts(entry.ports)}` : null,
        // 挂起态是用户主动制造的状态（Ctrl-Z），温和终止会把它唤醒才能生效 ——
        // 那是一次用户可见的状态改变，不能不打招呼就做
        !force && stopped ? "It is suspended; terminating resumes it so it can shut down." : null,
      ]
        .filter(Boolean)
        .join(" · "),
      icon: Icon.Trash,
      primaryAction: {
        title: force ? "Force Kill" : "Terminate",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!ok) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Terminating…" });
    // macOS 之外没有「温和/强制」之分（Windows 只有单一 TerminateProcess），
    // 再劝用户「更用力地杀一次」是承诺一个不存在的区别
    const canEscalate = !force && platform === "macos";
    try {
      await kill(cliPath, entry.pid, startUnix, force);
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not terminate";
      toast.message = e instanceof Error ? e.message : String(e);
      const code = e instanceof KillFailedError ? e.code : null;
      // 已消失 / PID 已被复用时**不提供** Force Kill：那两种情况下再杀一次，
      // 要么杀了个空气，要么正好杀掉一个无关的新进程
      if (canEscalate && code !== "process_gone" && code !== "pid_reused") {
        toast.primaryAction = { title: "Force Kill", onAction: () => void doKill(true) };
      }
      void onChanged();
      return;
    }

    toast.title = "Confirming…";
    const result = await confirmTermination(cliPath, entry.pid, startUnix, onChanged);
    if (result.kind === "gone") {
      toast.style = Toast.Style.Success;
      toast.title = `Terminated ${label}`;
      toast.message = `PID ${entry.pid}`;
      return;
    }
    if (result.kind === "unknown") {
      // 信号送出去了，但我们没能确认结果 —— 如实说，别猜
      toast.style = Toast.Style.Failure;
      toast.title = "Signal sent, result unknown";
      toast.message = `Could not re-scan to confirm PID ${entry.pid}. Refresh to check.`;
      return;
    }
    // Raycast 的 Toast 只有 Success / Failure / Animated 三种样式，没有中性档 ——
    // 这里选 Failure 是因为「没达成目的」需要被看见（桌面版有中性横幅可用，故那边不用红）
    toast.style = Toast.Style.Failure;
    toast.title = "Still running";
    toast.message = `PID ${entry.pid} took the signal but has not exited.`;
    if (canEscalate) {
      toast.primaryAction = { title: "Force Kill", onAction: () => void doKill(true) };
    }
  }

  async function toggleStar() {
    const action = entry.is_whitelisted ? "remove" : "add";
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving…" });
    try {
      await whitelist(cliPath, action, whitelistKey(entry));
      toast.style = Toast.Style.Success;
      toast.title = action === "add" ? "Starred" : "Unstarred";
      await onChanged();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update the whitelist";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  // 动作面板的第一项绑定 Enter。破坏性动作占首位只对**疑似残留**成立 ——
  // 那正是本命令存在的理由；而在 Healthy / Starred 分区，或缺身份令牌
  // （终止入口本就不呈现）的行上，Enter 必须落在无害动作上。
  const dangerFirst = entry.is_zombie_suspect && entry.start_unix != null;

  const dangerZone = entry.start_unix != null && (
    <ActionPanel.Section key="danger" title="Danger Zone">
      <Action
        title="Terminate"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={() => doKill(false)}
      />
      {/* Windows 只有单个 Terminate：detached 控制台进程没有可靠的温和 kill，
          引擎两种口径都走 TerminateProcess —— 桌面版的既定产品决定，这里保持
          一致，不承诺一个不存在的「温和/强制」区别。
          判断写成 === "macos" 而非 !== "windows"：Force Kill 是破坏性动作，
          只在确知平台支持 SIGTERM/SIGKILL 之分时才提供，unknown 一律不给 */}
      {platform === "macos" && (
        <Action
          title="Force Kill"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          onAction={() => doKill(true)}
        />
      )}
    </ActionPanel.Section>
  );

  const inspect = (
    <ActionPanel.Section key="inspect" title="Inspect">
      <Action
        title="Toggle Details"
        icon={Icon.Sidebar}
        // 手搓 ⌘D 会撞上 Keyboard.Shortcut.Common.Duplicate（macOS 上正是 ⌘D），
        // Store 的自动检查会建议把它换成语义完全不对的 "Duplicate"
        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        onAction={onToggleDetail}
      />
      {entry.ports.length === 1 && (
        <Action.OpenInBrowser
          title={`Open localhost${formatPorts(entry.ports)}`}
          url={`http://localhost:${entry.ports[0]}`}
        />
      )}
      {entry.ports.length > 1 && (
        <ActionPanel.Submenu title="Open Port in Browser…" icon={Icon.Globe}>
          {entry.ports.map((p) => (
            <Action.OpenInBrowser key={p} title={`localhost:${p}`} url={`http://localhost:${p}`} />
          ))}
        </ActionPanel.Submenu>
      )}
      {/* 只在 exe_path 真的是一条路径时才给 —— `ps -o comm=` 对 PATH 解析出的
          裸解释器名只返回 `node`，拿它去 Finder 里定位只会失败 */}
      {/[/\\]/.test(entry.exe_path) && <Action.ShowInFinder path={entry.exe_path} />}
    </ActionPanel.Section>
  );

  const manage = (
    <ActionPanel.Section key="manage" title="Manage">
      <Action
        title={entry.is_whitelisted ? "Unstar Process" : "Star Process"}
        icon={entry.is_whitelisted ? Icon.StarDisabled : Icon.Star}
        // Common.Pin（⌘⇧P）而非 Common.Save：这是「钉住 / 豁免」，不是「保存」
        shortcut={Keyboard.Shortcut.Common.Pin}
        onAction={toggleStar}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => void onChanged()}
      />
    </ActionPanel.Section>
  );

  const copy = (
    <ActionPanel.Section key="copy" title="Copy">
      <Action.CopyToClipboard
        title="Copy PID"
        content={String(entry.pid)}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action.CopyToClipboard
        title="Copy Command"
        content={entry.full_command || entry.command}
        shortcut={Keyboard.Shortcut.Common.CopyName}
      />
      {/[/\\]/.test(entry.exe_path) && (
        <Action.CopyToClipboard
          title="Copy Executable Path"
          content={entry.exe_path}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
      )}
      {/* 面向开发者：把引擎对这一行的完整判定原样交到用户手上（报 issue 用） */}
      <Action.CopyToClipboard title="Copy as JSON" content={JSON.stringify(entry, null, 2)} />
    </ActionPanel.Section>
  );

  return (
    <ActionPanel>
      {(dangerFirst
        ? [dangerZone, inspect, manage, copy]
        : [inspect, manage, dangerZone, copy]
      ).filter(Boolean)}
    </ActionPanel>
  );
}

/**
 * 终止后的存活确认：短时轮询到目标消失为止。
 *
 * 三种结果必须分开（不能只有「死了 / 没死」两态）：探测扫描自己失败时是
 * **没有证据**，把它当成成功会在错误页上盖一个绿色的「已终止」。
 *
 * 「消失」的口径 = **不再出现在扫描结果里**。扫描只列监听端口的进程与 dev-like
 * 的无端口孤儿，所以一个释放了端口却仍活着的进程也会算「消失」—— 对本产品可以
 * 接受（用户要的是端口回来），但别把它当成 `kill(pid, 0)` 那种存活探测。
 *
 * 用 `--cpu=skip` 探：引擎默认会先睡 200ms 做 CPU 采样，而这里只关心「还在不在」。
 * 身份用 `(pid, start_unix)` 成对比较，只比 PID 会把「PID 被回收后新起的另一个
 * 进程」误判成「没杀掉」。
 */
async function confirmTermination(
  cliPath: string,
  pid: number,
  startUnix: number,
  onChanged: () => Promise<ProcessEntry[] | null>,
): Promise<ConfirmResult> {
  await sleep(CONFIRM_FIRST_DELAY_MS);
  const deadline = Date.now() + CONFIRM_DEADLINE_MS;
  for (;;) {
    let rows: ProcessEntry[];
    try {
      rows = (await scan(cliPath, { cpuSamplingMs: "skip" })).entries;
    } catch (e) {
      // 探测失败不代表进程死了，也不代表它活着 —— 这一轮**没有证据**。
      // 之前这里 return null（= 已终止），于是一次扫描故障会盖出一个绿色的
      // 「Terminated」，而屏幕上同时还挂着错误页。
      console.error("portreaper-cli scan (termination probe):", e);
      await onChanged();
      return { kind: "unknown" };
    }
    const survivor = rows.find((r) => isSameProcess(r, pid, startUnix)) ?? null;
    if (survivor === null || Date.now() >= deadline) {
      // 探测扫描不写进 state（它带 --cpu=skip，CPU 列会全是 0）——
      // 这里再走一次常规 load 拿到完整数据。多花一次扫描，换列表口径一致。
      void onChanged();
      return survivor === null ? { kind: "gone" } : { kind: "alive", row: survivor };
    }
    await sleep(CONFIRM_POLL_MS);
  }
}

/**
 * 只有在「自动安装也失败了」之后才会看到这一页 —— 正常路径是静默下载并校验。
 * 到这里说明二进制存在但跑不起来（架构不符 / 被安全策略拦下 / 偏好路径写错）。
 */
function NotFoundView({
  searched,
  downloadError,
  busy,
  onRetry,
}: {
  searched: string[];
  downloadError?: string;
  busy: boolean;
  onRetry: () => void;
}) {
  // 两种处境，同一个页面：下载失败该看网络，遍寻不获该看安装。开头几行据此分叉，
  // 后半段（找过哪儿 / Retry / 自建）两者都用得上。
  const title = downloadError
    ? "Could not download portreaper-cli"
    : "Could not run portreaper-cli";
  const lead = downloadError
    ? [
        "The extension drives the same engine as the Portreaper desktop app, and downloads it",
        "on first use. That download did not go through:",
        "",
        `> ${downloadError}`,
        "",
        "This is usually no network connection, a proxy blocking github.com, or a VPN.",
        "Nothing was installed — retrying once you are back online is safe.",
      ]
    : [
        "The extension drives the same engine as the Portreaper desktop app. It tried the",
        "locations below, and none of them produced a working binary.",
      ];

  const md = [
    `# ${title}`,
    "",
    ...lead,
    "",
    "Looked in:",
    "",
    ...searched.map((s) => `- \`${s}\``),
    "",
    "Retrying will re-download the engine and verify its checksum. If that keeps failing,",
    "build it yourself and point the extension preference at the result:",
    "",
    "```",
    "cargo build --release -p portreaper-cli",
    "```",
  ].join("\n");

  return (
    <List isShowingDetail isLoading={busy}>
      <List.Item
        icon={{
          source: downloadError ? Icon.WifiDisabled : Icon.QuestionMark,
          tintColor: Color.Orange,
        }}
        title={title}
        detail={<List.Item.Detail markdown={md} />}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
            <Action.CopyToClipboard
              title="Copy Build Command"
              content="cargo build --release -p portreaper-cli"
            />
            <Action.OpenInBrowser
              title="Open Releases Page"
              url="https://github.com/fanhefeng/portreaper/releases/latest"
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

/** 引擎给的是 f64；NaN / Infinity 会让 `toFixed` 之外的一切假设都失效，
 *  而 render 里抛异常在 Raycast 上就是一块崩溃屏。守一下几乎不要钱。 */
function pct(v: number): string {
  return Number.isFinite(v) ? `${v.toFixed(1)}%` : "—";
}

function mb(v: number): string {
  return Number.isFinite(v) ? `${v.toFixed(0)} MB` : "—";
}

function formatUptime(secs: number): string {
  if (!Number.isFinite(secs) || secs < 0) return "—";
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  return `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h`;
}
