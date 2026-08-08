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
 */

import { rm } from "node:fs/promises";
import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  showToast,
  Keyboard,
} from "@raycast/api";

import {
  CliNotFoundError,
  SchemaMismatchError,
  type Confidence,
  type Platform,
  type ProcessEntry,
  type ScanReport,
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
  installCli,
  installedCliPath,
} from "./install";

type State =
  | { kind: "loading" }
  | { kind: "installing"; step: string }
  | { kind: "ready"; cliPath: string; platform: Platform; entries: ProcessEntry[] }
  // downloadError：走到引导页的原因是「下载没成功」而不是「哪儿都没找到」。
  // 两者的用户处境不同（前者该看网络，后者该看安装），引导页据此换措辞。
  | { kind: "no-cli"; searched: string[]; downloadError?: string }
  | { kind: "error"; message: string };

const CONFIDENCE_COLOR: Record<Confidence, Color> = {
  confirmed: Color.Red,
  likely: Color.Orange,
  possible: Color.Yellow,
  none: Color.SecondaryText,
};

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
    (portQ !== "" && e.ports.some((p) => String(p).includes(portQ))) ||
    String(e.pid).includes(q)
  );
}

export default function SearchPorts() {
  const [state, setState] = useState<State>({ kind: "loading" });
  // 默认展开详情：本工具的卖点是「为什么判它是残留」，藏起证据就只剩一个端口列表。
  const [showDetail, setShowDetail] = useState(true);
  // 自己接管过滤（List 的 filtering={false}）：内建过滤只隐藏 item，分区标题的
  // 计数仍由扩展按全量 entries 算，于是搜索时会出现「筛出 3 行却写着 Healthy 12」
  // 的自相矛盾（真机 QA 发现）。把过滤前移到分桶之前，计数与条目就恒等一致。
  const [searchText, setSearchText] = useState("");

  async function load() {
    const prefs = getPreferenceValues<Preferences.SearchPorts>();
    const supportPath = environment.supportPath;
    const searched = searchedLocations(prefs.cliPath, supportPath);
    try {
      const install = () =>
        installCli(supportPath, (step) => setState({ kind: "installing", step }));

      let cliPath = resolveCliPath(prefs.cliPath, supportPath);
      if (cliPath === null) {
        // 首次使用：自己把引擎取回来。Raycast Store 不允许把安装工作丢给用户，
        // 允许的是「从可信源下载 + 校验完整性」——见 install.ts。
        setState({ kind: "installing", step: "Preparing…" });
        cliPath = await install();
      }
      try {
        await verifyCli(cliPath, searched);
      } catch (e) {
        // 托管副本跑不起来（下载被截断、换过架构、执行位丢了）时删掉重取一次 ——
        // 否则扩展会卡死在「找不到 CLI」，而引导页明明写着我们会重新下载。
        // 只对**我们自己下载的那份**这么做：用户在偏好里显式指定的路径不擅自删。
        if (cliPath !== installedCliPath(supportPath)) throw e;
        setState({ kind: "installing", step: "Replacing an unusable copy…" });
        await rm(cliPath, { force: true });
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
        // 只换**我们自己下载的那份**（用户显式指定的路径不擅自删），且**只换一次**：
        // 新下的仍对不上，说明扩展与已发布的 CLI 确实不同代，那是真错误，
        // 必须如实报给用户，绝不无限重下。
        if (!(e instanceof SchemaMismatchError)) throw e;
        if (cliPath !== installedCliPath(supportPath)) throw e;
        setState({ kind: "installing", step: "Updating the engine…" });
        await rm(cliPath, { force: true });
        cliPath = await install();
        await verifyCli(cliPath, searched);
        report = await scan(cliPath);
      }
      setState({ kind: "ready", cliPath, platform: report.platform, entries: report.entries });
    } catch (e) {
      if (e instanceof CliNotFoundError) {
        setState({ kind: "no-cli", searched: e.searched });
      } else if (e instanceof DownloadFailedError) {
        // 断网 / 代理 / release 404：**必须**落到引导页，不能只甩一句 fetch failed。
        // 这是首次使用的默认失败路径，用户手里还没有引擎，错误页里得有出口。
        setState({ kind: "no-cli", searched, downloadError: e.detail });
      } else if (e instanceof UnsupportedPlatformError) {
        setState({
          kind: "error",
          message: `${e.message}. Portreaper ships macOS (arm64/x64) and Windows x64 builds only.`,
        });
      } else if (e instanceof ChecksumMismatchError) {
        // 校验不过绝不退化成「那就直接用吧」——这是安全边界，不是体验问题。
        setState({
          kind: "error",
          message:
            "The downloaded engine failed its SHA-256 check and was discarded. " +
            "Check your network (a proxy may be rewriting the download) and retry.",
        });
      } else if (e instanceof SchemaMismatchError) {
        setState({
          kind: "error",
          message: `${e.message}. Update this extension (or the CLI) so both speak the same contract.`,
        });
      } else {
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  // 只在首次挂载时扫描；后续刷新走 Action（避免每次渲染都 spawn 一个进程）
  useEffect(() => {
    void load();
  }, []);

  if (state.kind === "installing") {
    return (
      <List isLoading>
        <List.EmptyView
          icon={Icon.Download}
          title="Setting up portreaper-cli"
          description={`${state.step}\n\nDownloading the classification engine from the project's GitHub release and verifying its SHA-256 checksum. This happens once.`}
        />
      </List>
    );
  }
  if (state.kind === "no-cli") {
    return (
      <NotFoundView searched={state.searched} downloadError={state.downloadError} onRetry={load} />
    );
  }
  if (state.kind === "error") {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Scan failed"
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

  const loading = state.kind === "loading";
  const entries = state.kind === "ready" ? state.entries : [];
  const cliPath = state.kind === "ready" ? state.cliPath : "";
  const platform: Platform = state.kind === "ready" ? state.platform : "unknown";

  // 分组与桌面版一致：疑似 → 收藏 → 其余。引擎已按「疑似优先 + 置信度」排好序，
  // 这里只做分桶，不再二次排序（排序规则属于引擎，前端重排会与桌面版视觉不一致）。
  // 先过滤再分桶 —— 分区计数取自各桶长度，因此与实际渲染的行数恒等。
  const visible = entries.filter((e) => matchesQuery(e, searchText));
  const suspects = visible.filter((e) => e.is_zombie_suspect);
  const starred = visible.filter((e) => e.is_whitelisted);
  const healthy = visible.filter((e) => !e.is_zombie_suspect && !e.is_whitelisted);

  const shared = {
    cliPath,
    platform,
    onChanged: load,
    showDetail,
    onToggleDetail: () => setShowDetail((v) => !v),
  };

  return (
    <List
      isLoading={loading}
      isShowingDetail={showDetail && visible.length > 0}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter by name, port, or PID…"
    >
      <Section title="Suspects" entries={suspects} {...shared} />
      <Section title="Starred" entries={starred} {...shared} />
      <Section title="Healthy" entries={healthy} {...shared} />
      {!loading && entries.length === 0 && (
        <List.EmptyView
          icon={Icon.Check}
          title="Nothing is listening"
          description="No listening processes and no orphaned dev processes."
        />
      )}
      {/* 接管过滤后「搜索无结果」也得自己兜：内建过滤会渲染 Raycast 的
          No Results 页，filtering={false} 之后那页不再出现，缺了就是一片空白。 */}
      {!loading && entries.length > 0 && visible.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches"
          description={`Nothing matches “${searchText.trim()}”. Try a port, a PID, or part of the process name.`}
        />
      )}
    </List>
  );
}

type SharedProps = {
  cliPath: string;
  /** ScanReport.platform —— Windows 上动作布局要跟桌面版的产品决定对齐 */
  platform: Platform;
  onChanged: () => void;
  showDetail: boolean;
  onToggleDetail: () => void;
};

function Section(props: { title: string; entries: ProcessEntry[] } & SharedProps) {
  const { title, entries, ...shared } = props;
  if (entries.length === 0) return null;
  return (
    <List.Section title={title} subtitle={String(entries.length)}>
      {entries.map((e) => (
        <Row key={e.pid} entry={e} {...shared} />
      ))}
    </List.Section>
  );
}

function Row({ entry, ...shared }: { entry: ProcessEntry } & SharedProps) {
  const ports = entry.ports.length > 0 ? entry.ports.join(", ") : "no port";
  const accessories: List.Item.Accessory[] = [];

  if (entry.is_whitelisted) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  }
  if (entry.is_zombie_suspect) {
    accessories.push({
      tag: {
        value: entry.confidence,
        color: CONFIDENCE_COLOR[entry.confidence],
      },
    });
  }
  // 子树 CPU 而非行内 CPU：headless 浏览器把 CPU 全烧在子进程里，
  // 主进程读数是 ~0%（这正是桌面版 cpu_percent_tree 存在的原因）
  if (entry.cpu_percent_tree >= 1) {
    accessories.push({ text: `${entry.cpu_percent_tree.toFixed(0)}% cpu` });
  }
  accessories.push({ text: `pid ${entry.pid}` });

  return (
    <List.Item
      icon={entry.is_zombie_suspect ? Icon.ExclamationMark : Icon.CircleFilled}
      title={entry.app_label || entry.command}
      subtitle={ports}
      accessories={accessories}
      // 不再声明 keywords：过滤已由 matchesQuery 接管（List filtering={false}），
      // 留着会让人以为搜索命中范围由这里定义 —— 实际它已被忽略。
      detail={shared.showDetail ? <Detail entry={entry} /> : undefined}
      actions={<Actions entry={entry} {...shared} />}
    />
  );
}

function Detail({ entry }: { entry: ProcessEntry }) {
  const chain = entry.parent_chain.map((p) => `${p.label} (${p.pid})`).join(" → ") || "—";
  const md = [
    `# ${entry.app_label || entry.command}`,
    "",
    `\`${entry.full_command || entry.command}\``,
    "",
    "## Why it is listed",
    "",
    entry.zombie_reasons.length > 0
      ? entry.zombie_reasons.map((r) => `- \`${r}\``).join("\n")
      : "- not flagged",
    "",
    "> Codes come straight from the engine. The desktop app explains each one in full.",
    "",
    "## Launcher chain",
    "",
    chain,
  ].join("\n");

  return (
    <List.Item.Detail
      markdown={md}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="PID" text={String(entry.pid)} />
          <List.Item.Detail.Metadata.Label title="Category" text={entry.app_category} />
          <List.Item.Detail.Metadata.Label
            title="Ports"
            text={entry.ports.length > 0 ? entry.ports.join(", ") : "—"}
          />
          <List.Item.Detail.Metadata.Label title="Uptime" text={formatUptime(entry.elapsed_secs)} />
          <List.Item.Detail.Metadata.Label
            title="CPU (self / tree)"
            text={`${entry.cpu_percent.toFixed(1)}% / ${entry.cpu_percent_tree.toFixed(1)}%`}
          />
          <List.Item.Detail.Metadata.Label title="Memory" text={`${entry.mem_mb.toFixed(0)} MB`} />
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
  async function doKill(force: boolean) {
    // 没有身份令牌就不该走到这里（引擎会 fail-closed 拒绝）——但提前挡住，
    // 给出的提示比引擎的通用错误更有指导性。
    if (entry.start_unix == null) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No identity token",
        message: "Refresh the list first — killing without one is refused by design.",
      });
      return;
    }
    const ok = await confirmAlert({
      title: `Terminate ${entry.app_label || entry.command}?`,
      message: `PID ${entry.pid}${entry.ports.length ? ` · port ${entry.ports.join(", ")}` : ""}`,
      icon: Icon.Trash,
      primaryAction: {
        title: force ? "Force kill" : "Terminate",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!ok) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Terminating…",
    });
    try {
      await kill(cliPath, entry.pid, entry.start_unix, force);
      toast.style = Toast.Style.Success;
      toast.title = `Terminated ${entry.pid}`;
      onChanged();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not terminate";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  async function toggleStar() {
    const action = entry.is_whitelisted ? "remove" : "add";
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving…",
    });
    try {
      await whitelist(cliPath, action, whitelistKey(entry));
      toast.style = Toast.Style.Success;
      toast.title = action === "add" ? "Starred" : "Unstarred";
      onChanged();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not update the whitelist";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <ActionPanel>
      {/* 没有身份令牌的行**不提供**终止入口：引擎 fail-closed，doKill 也会拦，
          但一个点下去只能得到失败提示的破坏性动作本身就是坏体验 —— 何况它长得
          和能用的那个一模一样。doKill 里的那道检查照旧保留：这里管的是「不呈现」，
          那里管的是「即便被呈现出来也绝不放行」（比如将来新增别的调用点）。 */}
      {entry.start_unix != null && (
        <ActionPanel.Section>
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
      )}
      <ActionPanel.Section>
        <Action
          title={entry.is_whitelisted ? "Remove Star" : "Star (Exempt from Suspicion)"}
          icon={Icon.Star}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={toggleStar}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onChanged}
        />
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={onToggleDetail}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy PID" content={String(entry.pid)} />
        <Action.CopyToClipboard
          title="Copy Command"
          content={entry.full_command || entry.command}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

/**
 * 只有在「自动安装也失败了」之后才会看到这一页 —— 正常路径是静默下载并校验。
 * 到这里说明二进制存在但跑不起来（架构不符 / 被安全策略拦下 / 偏好路径写错）。
 */
function NotFoundView({
  searched,
  downloadError,
  onRetry,
}: {
  searched: string[];
  downloadError?: string;
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
    <List isShowingDetail>
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
          </ActionPanel>
        }
      />
    </List>
  );
}

function formatUptime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  return `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h`;
}
