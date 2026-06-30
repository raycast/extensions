import { useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  AdminApiError,
  getPeriodUsage,
  monthToDateRange,
  todayRange,
  type ModelRow,
  type PeriodUsage,
  type TokenBreakdown,
} from "./lib/admin-api";
import {
  getThisMonthUsage,
  getTodayUsage,
  type PeriodUsage as CcusagePeriodUsage,
} from "./lib/ccusage";
import {
  getKeyStatus,
  keyKind,
  type KeyStatusResult,
  type RateWindow,
} from "./lib/key-status";
import {
  countdown,
  formatCost,
  formatNumber,
  modelFamilyColor,
  shortModelName,
  thresholdColor,
} from "./lib/format";
import { limitCardImage } from "./lib/svg";
import { homedir } from "os";

const ADMIN_KEYS_DOCS =
  "https://platform.claude.com/docs/en/manage-claude/admin-api-keys";

const RATE_LIMITS_DOCS = "https://platform.claude.com/docs/en/api/rate-limits";

type AllPeriods = {
  today: PeriodUsage;
  month: PeriodUsage;
};

async function loadAll(): Promise<AllPeriods> {
  const [today, month] = await Promise.all([
    getPeriodUsage(todayRange()),
    getPeriodUsage(monthToDateRange()),
  ]);
  return { today, month };
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();

  // Branch by the configured key. An ADMIN key (`sk-ant-admin01-…`) can read the
  // org-wide usage/cost reports, so it keeps the dedicated Admin view. Every
  // other case (a STANDARD key OR no key at all) falls back to the local,
  // ccusage-powered usage view — which needs no API key to function. A standard
  // key still unlocks the on-demand "Rate-Limit Headroom" probe from there.
  if (keyKind(prefs.adminApiKey) === "admin") {
    return <AdminUsageView />;
  }
  return <ApiUsageView prefs={prefs} />;
}

function AdminUsageView() {
  const prefs = getPreferenceValues<Preferences>();
  const [showingDetail, setShowingDetail] = useState(false);

  const { data, isLoading, error, revalidate } = useCachedPromise(loadAll, [], {
    keepPreviousData: true,
    onError: async (err) => {
      // Background refresh failures (we still have previous data) would otherwise
      // be silent — surface them as a toast. The dedicated "Add your key" empty
      // state already covers the not-configured case, so don't double-warn there.
      if (err instanceof AdminApiError && err.kind === "not_configured") return;
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn’t refresh API usage",
        message: err instanceof Error ? err.message : String(err),
      });
    },
  });

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => revalidate()}
    />
  );

  const docsAction = (
    <Action.OpenInBrowser
      title="Open Admin API Keys Guide"
      icon={Icon.Key}
      url={ADMIN_KEYS_DOCS}
    />
  );

  const prefsAction = (
    <Action
      title="Set Admin API Key"
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
    />
  );

  // Error states (only when there's no previous data to fall back on).
  if (error && !data) {
    const isNotConfigured =
      error instanceof AdminApiError && error.kind === "not_configured";

    if (isNotConfigured) {
      return (
        <List>
          <List.EmptyView
            icon={{ source: Icon.Key, tintColor: Color.Yellow }}
            title="Add Your Anthropic Admin API Key"
            description={
              "This command reads your organization's API token usage & cost via the Anthropic Admin API.\n\n" +
              "1. Press ↵ (Set Admin API Key) to open preferences.\n" +
              "2. Paste an Admin API key (sk-ant-admin01-…) into “Anthropic Admin API Key” — create one in the Anthropic Console (org admin required).\n" +
              "3. Press ⌘R to refresh.\n\n" +
              "This only reads usage — it never affects your local Claude Code subscription."
            }
            actions={
              <ActionPanel>
                {prefsAction}
                {docsAction}
                {refreshAction}
              </ActionPanel>
            }
          />
        </List>
      );
    }

    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Couldn’t Load API Usage"
          description={
            error instanceof Error
              ? error.message
              : String(error ?? "Unknown error")
          }
          actions={
            <ActionPanel>
              {refreshAction}
              {prefsAction}
              {docsAction}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const detailToggle = (
    <Action
      title={showingDetail ? "Hide Details" : "Show Details"}
      icon={Icon.Sidebar}
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      onAction={() => setShowingDetail((s) => !s)}
    />
  );

  const sharedActions = (
    <ActionPanel>
      {refreshAction}
      {detailToggle}
      {prefsAction}
      {docsAction}
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      navigationTitle="Claude API Usage"
    >
      <PeriodSection
        title="Today"
        subtitle="UTC day"
        period={data?.today}
        prefs={prefs}
        showingDetail={showingDetail}
        actions={sharedActions}
      />
      <PeriodSection
        title="Month to Date"
        subtitle="UTC month"
        period={data?.month}
        prefs={prefs}
        showingDetail={showingDetail}
        actions={sharedActions}
      />
    </List>
  );
}

function PeriodSection({
  title,
  subtitle,
  period,
  prefs,
  showingDetail,
  actions,
}: {
  title: string;
  subtitle: string;
  period: PeriodUsage | undefined;
  prefs: Preferences;
  showingDetail: boolean;
  actions: React.ReactNode;
}) {
  if (!period) {
    // No data yet for this period (initial load / failed silently).
    return (
      <List.Section title={title} subtitle={subtitle}>
        <List.Item icon={Icon.Hourglass} title="Loading…" actions={actions} />
      </List.Section>
    );
  }

  const approx = prefs.currency === "KRW";

  return (
    <List.Section title={title} subtitle={subtitle}>
      {/* Summary row */}
      <List.Item
        icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
        title="Total"
        keywords={["summary", "total", title]}
        accessories={accessoriesFor(
          period.total.tokens.total,
          period.total.usd,
          prefs,
          approx,
        )}
        detail={
          showingDetail ? (
            <ModelDetail
              model="All models"
              tokens={period.total.tokens}
              usd={period.total.usd}
              prefs={prefs}
              approx={approx}
            />
          ) : undefined
        }
        actions={actions}
      />

      {/* Per-model rows */}
      {period.models.length === 0 ? (
        <List.Item
          icon={Icon.Dot}
          title="No usage in this period"
          actions={actions}
        />
      ) : (
        period.models.map((row) => (
          <ModelItem
            key={`${title}:${row.model}`}
            row={row}
            prefs={prefs}
            approx={approx}
            showingDetail={showingDetail}
            actions={actions}
          />
        ))
      )}
    </List.Section>
  );
}

function ModelItem({
  row,
  prefs,
  approx,
  showingDetail,
  actions,
}: {
  row: ModelRow;
  prefs: Preferences;
  approx: boolean;
  showingDetail: boolean;
  actions: React.ReactNode;
}) {
  return (
    <List.Item
      icon={{
        source: Icon.ComputerChip,
        tintColor: modelFamilyColor(row.model),
      }}
      title={row.model}
      accessories={accessoriesFor(row.tokens.total, row.usd, prefs, approx)}
      detail={
        showingDetail ? (
          <ModelDetail
            model={row.model}
            tokens={row.tokens}
            usd={row.usd}
            prefs={prefs}
            approx={approx}
          />
        ) : undefined
      }
      actions={actions}
    />
  );
}

function accessoriesFor(
  totalTokens: number,
  usd: number | null,
  prefs: Preferences,
  approx: boolean,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [
    {
      text: `${formatNumber(totalTokens)} tok`,
      icon: { source: Icon.Coins, tintColor: Color.SecondaryText },
      tooltip: "Total tokens",
    },
  ];
  accessories.push({
    tag: { value: formatCost(usd, prefs), color: Color.Green },
    tooltip: approx ? "Approximate (KRW conversion)" : "Cost (USD)",
  });
  return accessories;
}

function ModelDetail({
  model,
  tokens,
  usd,
  prefs,
  approx,
}: {
  model: string;
  tokens: TokenBreakdown;
  usd: number | null;
  prefs: Preferences;
  approx: boolean;
}) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Uncached Input"
            text={formatNumber(tokens.uncachedInput)}
          />
          <List.Item.Detail.Metadata.Label
            title="Cache Read"
            text={formatNumber(tokens.cacheRead)}
          />
          <List.Item.Detail.Metadata.Label
            title="Cache Creation (5m)"
            text={formatNumber(tokens.cacheCreation5m)}
          />
          <List.Item.Detail.Metadata.Label
            title="Cache Creation (1h)"
            text={formatNumber(tokens.cacheCreation1h)}
          />
          <List.Item.Detail.Metadata.Label
            title="Output"
            text={formatNumber(tokens.output)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Total Tokens"
            text={formatNumber(tokens.total)}
          />
          <List.Item.Detail.Metadata.Label
            title={approx ? "Cost (approx.)" : "Cost"}
            text={formatCost(usd, prefs)}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// --- Standard-key rate-limit view -----------------------------------------

/** Utilization percent (0–100) for a window, or `null` when unknown. */
function usedPct(w: RateWindow): number | null {
  return w.limit && w.remaining != null
    ? ((w.limit - w.remaining) / w.limit) * 100
    : null;
}

/** "Resets in" countdown text for a window: `1h 48m`, `now`, or `—`. */
function resetCountdown(w: RateWindow, now: number): string {
  if (!w.resetsAt) return "—";
  return countdown(w.resetsAt.getTime() - now);
}

/** Mask the configured key — only a recognizable prefix + last 4 chars. */
function maskKey(key: string | undefined): string {
  const k = (key ?? "").trim();
  if (k === "") return "—";
  const last4 = k.length > 4 ? k.slice(-4) : k;
  const prefix = k.startsWith("sk-ant-") ? "sk-ant-api" : "key";
  return `${prefix}…${last4}`;
}

function KeyStatusView({ prefs }: { prefs: Preferences }) {
  // Pass the key into the closure (not as a cache arg) so it is never
  // serialized into Raycast's on-disk cache.
  const { data, isLoading, revalidate } = useCachedPromise(
    () => getKeyStatus(prefs.adminApiKey ?? ""),
    [],
    { keepPreviousData: true },
  );

  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => revalidate()}
    />
  );

  const prefsAction = (
    <Action
      title="Set Admin API Key"
      icon={Icon.Gear}
      onAction={openExtensionPreferences}
    />
  );

  const docsAction = (
    <Action.OpenInBrowser
      title="Open Rate Limits Docs"
      icon={Icon.Book}
      url={RATE_LIMITS_DOCS}
    />
  );

  const actions = (
    <ActionPanel>
      {refreshAction}
      {prefsAction}
      {docsAction}
    </ActionPanel>
  );

  // Auth failure → friendly "set a valid key" state.
  if (data && !data.ok && data.kind === "auth") {
    const markdown = [
      "# Claude API — Key Status",
      "",
      "**Invalid or unauthorized API key**",
      "",
      "The key was rejected with a 401/403. Make sure you pasted a valid Anthropic API key.",
      "",
      "- For **rate-limit status**, use a standard key (`sk-ant-api…`).",
      "- For **org usage & cost**, use an Admin key (`sk-ant-admin01-…`).",
      "",
      "Press ↵ to open preferences and update the key.",
    ].join("\n");
    return (
      <Detail
        isLoading={isLoading}
        navigationTitle="Claude API — Key Status"
        markdown={markdown}
        actions={
          <ActionPanel>
            {prefsAction}
            {refreshAction}
            {docsAction}
          </ActionPanel>
        }
      />
    );
  }

  // Network / other failure → readable message + Refresh.
  if (data && !data.ok) {
    const markdown = [
      "# Claude API — Key Status",
      "",
      "**Couldn’t read key status**",
      "",
      data.message,
      "",
      "Press ⌘R to try again.",
    ].join("\n");
    return (
      <Detail
        isLoading={isLoading}
        navigationTitle="Claude API — Key Status"
        markdown={markdown}
        actions={actions}
      />
    );
  }

  const markdown =
    data && data.ok
      ? renderKeyStatusMarkdown(data)
      : "# Claude API — Key Status\n\n_Probing key status…_";
  const metadata =
    data && data.ok ? renderKeyStatusMetadata(prefs, data) : undefined;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Claude API — Key Status"
      markdown={markdown}
      metadata={metadata}
      actions={actions}
    />
  );
}

function renderKeyStatusMarkdown(
  data: Extract<KeyStatusResult, { ok: true }>,
): string {
  const now = Date.now();
  const lines: string[] = [];

  lines.push("# Claude API — Key Status");
  lines.push("");
  lines.push(
    "_Standard key — cumulative usage & cost require an Admin key. Showing current rate-limit budget._",
  );
  lines.push("");

  // Requests hero gauge.
  const req = data.requests;
  lines.push(
    limitCardImage(
      {
        label: "Requests",
        countdown: resetCountdown(req, now),
        percentUsed: usedPct(req),
        caption: `${formatNumber(req.remaining)} of ${formatNumber(req.limit)} left`,
      },
      // Encode live values in the alt so the cached image refreshes on change.
      `requests ${req.remaining ?? "—"}/${req.limit ?? "—"}`,
    ),
  );
  lines.push("");

  // Tokens hero gauge.
  const tok = data.tokens;
  lines.push(
    limitCardImage(
      {
        label: "Tokens",
        countdown: resetCountdown(tok, now),
        percentUsed: usedPct(tok),
        caption: `${formatNumber(tok.remaining)} of ${formatNumber(tok.limit)} left`,
      },
      `tokens ${tok.remaining ?? "—"}/${tok.limit ?? "—"}`,
    ),
  );
  lines.push("");
  lines.push(
    "_Rate limits are read via one minimal probe request to the API (a single 1-token message — negligible cost)._",
  );

  return lines.join("\n");
}

function renderKeyStatusMetadata(
  prefs: Preferences,
  data: Extract<KeyStatusResult, { ok: true }>,
): React.ReactNode {
  const now = Date.now();
  const input = data.inputTokens;
  const output = data.outputTokens;

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Key"
        text={maskKey(prefs.adminApiKey)}
        icon={{ source: Icon.Key, tintColor: Color.SecondaryText }}
      />
      <Detail.Metadata.Label title="Type" text="Standard" />
      <Detail.Metadata.Label
        title="Models Available"
        text={data.modelsCount != null ? formatNumber(data.modelsCount) : "—"}
        icon={{ source: Icon.ComputerChip, tintColor: Color.Blue }}
      />

      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Input Tokens"
        text={`${formatNumber(input.remaining)} / ${formatNumber(input.limit)}`}
        icon={{ source: Icon.Coins, tintColor: Color.SecondaryText }}
      />
      {input.resetsAt ? (
        <Detail.Metadata.Label
          title="Input Resets In"
          text={countdown(input.resetsAt.getTime() - now)}
          icon={{
            source: Icon.Clock,
            tintColor: thresholdColor(usedPct(input)),
          }}
        />
      ) : null}
      <Detail.Metadata.Label
        title="Output Tokens"
        text={`${formatNumber(output.remaining)} / ${formatNumber(output.limit)}`}
        icon={{ source: Icon.Coins, tintColor: Color.SecondaryText }}
      />
      {output.resetsAt ? (
        <Detail.Metadata.Label
          title="Output Resets In"
          text={countdown(output.resetsAt.getTime() - now)}
          icon={{
            source: Icon.Clock,
            tintColor: thresholdColor(usedPct(output)),
          }}
        />
      ) : null}

      {data.retryAfterSec != null ? (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Retry-After"
            text={`${formatNumber(data.retryAfterSec)} s`}
            icon={{ source: Icon.Hourglass, tintColor: Color.Orange }}
          />
        </>
      ) : null}

      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Probed"
        text={`${countdown(now - data.probedAt.getTime())} ago`}
        icon={{ source: Icon.Dot, tintColor: Color.SecondaryText }}
      />
    </Detail.Metadata>
  );
}

// --- Local ccusage usage view (no API key required) ------------------------

const SOURCE_DISCLAIMER =
  "추정치 · 로컬 Claude Code 로그(ccusage) 기준 · 실제 청구액 아님";

/** Clamp a number into the inclusive [min, max] range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Parse the monthly-budget preference; blank/NaN/≤0 means "no budget". */
function parseBudget(raw: string | undefined): number | null {
  const parsed = Number.parseFloat((raw ?? "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Short local label for when the monthly budget rolls over, e.g. `Jul 1`. */
function firstOfNextMonthLabel(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" },
  );
}

/**
 * Default view: estimated token/cost usage read from the LOCAL Claude Code logs
 * via the `ccusage` CLI — no Anthropic API key required. Toggles between this
 * month and today, and (when a standard key is configured) offers an on-demand
 * push into the rate-limit probe so that probe never runs on open.
 */
function ApiUsageView({ prefs }: { prefs: Preferences }) {
  const [period, setPeriod] = useState<"month" | "today">("month");

  // Prefer the per-key dedicated dir so this view aggregates only the company
  // API key's Claude Code usage; otherwise fall back to the general dir.
  const apiConfigDir =
    prefs.apiUsageConfigDir?.trim() ||
    prefs.claudeConfigDir?.trim() ||
    undefined;

  const { data, isLoading, revalidate } = useCachedPromise(
    (p: "month" | "today", configDir: string | undefined) =>
      p === "month" ? getThisMonthUsage(configDir) : getTodayUsage(configDir),
    [period, apiConfigDir],
    {
      keepPreviousData: true,
      onError: async (err) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn’t read local Claude Code usage",
          message: err instanceof Error ? err.message : String(err),
        });
      },
    },
  );

  const budget = parseBudget(prefs.monthlyBudgetUsd);
  const hasStandardKey = keyKind(prefs.adminApiKey) === "standard";

  const actions = (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => revalidate()}
      />
      <Action
        title="Toggle Today / This Month"
        icon={Icon.Repeat}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={() => setPeriod((p) => (p === "month" ? "today" : "month"))}
      />
      {hasStandardKey ? (
        <Action.Push
          title="Rate-Limit Headroom"
          icon={Icon.Gauge}
          target={<KeyStatusView prefs={prefs} />}
        />
      ) : null}
      <Action
        title="Set Monthly Budget"
        icon={Icon.BankNote}
        onAction={openExtensionPreferences}
      />
      <Action
        title="Set API Key"
        icon={Icon.Key}
        onAction={openExtensionPreferences}
      />
      <Action
        title="Set API Usage Config Dir"
        icon={Icon.Folder}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );

  // Genuinely-empty period (also the shape ccusage returns when it fails): the
  // zeroed result is indistinguishable from "no usage", so show the friendly
  // not-found state rather than an all-zeros gauge.
  if (
    data &&
    data.models.length === 0 &&
    data.totalCostUSD === 0 &&
    data.totalTokens === 0
  ) {
    return (
      <Detail
        isLoading={isLoading}
        navigationTitle="Claude Code Usage"
        markdown={renderApiUsageEmpty(period)}
        actions={actions}
      />
    );
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle="Claude Code Usage"
      markdown={
        data
          ? renderApiUsageMarkdown(data, period, budget, prefs)
          : "# Claude Code Usage\n\n_Reading local usage from ccusage…_"
      }
      metadata={
        data
          ? renderApiUsageMetadata(data, period, budget, prefs, apiConfigDir)
          : undefined
      }
      actions={actions}
    />
  );
}

function renderApiUsageMarkdown(
  data: CcusagePeriodUsage,
  period: "month" | "today",
  budget: number | null,
  prefs: Preferences,
): string {
  const total = data.totalCostUSD;
  const pct = budget ? clamp((total / budget) * 100, 0, 100) : null;
  const caption = budget
    ? `${formatCost(total, prefs)} of ${formatCost(budget, prefs)} · resets ${firstOfNextMonthLabel()} · est., local Claude Code`
    : `${formatCost(total, prefs)} · ${formatNumber(data.totalTokens)} tokens · est., local Claude Code`;

  const lines: string[] = [];
  lines.push(
    period === "month"
      ? "# Claude Code Usage — This Month"
      : "# Claude Code Usage — Today",
  );
  lines.push("");
  lines.push(
    limitCardImage(
      {
        label: period === "month" ? "THIS MONTH" : "TODAY",
        labelSuffix: "",
        // With no monthly budget set, the right side has no percent to label, so
        // emit an empty label rather than a misleading "OF BUDGET" over a dash.
        valueLabel: budget ? "OF BUDGET" : "",
        countdown: formatCost(total, prefs),
        percentUsed: pct,
        caption,
      },
      // Encode live values in the alt so the cached image refreshes on change.
      `${period} ${formatCost(total, prefs)} ${formatNumber(data.totalTokens)} ${
        pct == null ? "no-budget" : `${Math.round(pct)}%`
      }`,
    ),
  );
  lines.push("");
  lines.push(`_${data.label} · ⌘T로 오늘/이번 달 전환_`);
  return lines.join("\n");
}

function renderApiUsageEmpty(period: "month" | "today"): string {
  const scope = period === "month" ? "이번 달" : "오늘";
  return [
    period === "month"
      ? "# Claude Code Usage — This Month"
      : "# Claude Code Usage — Today",
    "",
    `**${scope} 로컬 Claude Code 사용 기록을 찾지 못했어요.**`,
    "",
    "이 화면은 Anthropic API 키 없이, 로컬 `~/.claude` 로그를 `ccusage`로 읽어 추정치를 보여줍니다. 아직 기록이 없거나 경로/실행기 설정이 필요할 수 있어요:",
    "",
    "- Claude Code를 한 번 사용한 뒤 **⌘R**로 새로고침하세요.",
    "- 로그 위치가 다르면 **Claude Config Directory** 설정을 확인하세요.",
    "- `npx`/`bunx` 실행기는 **ccusage Runner** 설정에서 바꿀 수 있어요.",
    "- **⌘T**로 오늘/이번 달을 전환할 수 있어요.",
    "",
    `_${SOURCE_DISCLAIMER}_`,
  ].join("\n");
}

/** Abbreviate a config-dir path for display, collapsing $HOME to "~". */
function abbrevHome(p?: string): string {
  if (!p) return "~/.claude (default)";
  const home = homedir();
  return p.startsWith(home) ? "~" + p.slice(home.length) : p;
}

function renderApiUsageMetadata(
  data: CcusagePeriodUsage,
  period: "month" | "today",
  budget: number | null,
  prefs: Preferences,
  apiConfigDir: string | undefined,
): React.ReactNode {
  const models = data.models.slice(0, 6);
  const hidden = data.models.length - models.length;

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Period"
        text={`${period === "month" ? "This Month" : "Today"} · ${data.label}`}
        icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
      />
      <Detail.Metadata.Label
        title="Toggle"
        text="⌘T — Today / This Month"
        icon={{ source: Icon.Repeat, tintColor: Color.SecondaryText }}
      />

      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Total Cost (est.)"
        text={formatCost(data.totalCostUSD, prefs)}
        icon={{ source: Icon.BankNote, tintColor: Color.Green }}
      />
      {budget ? (
        <Detail.Metadata.Label
          title="Monthly Budget"
          text={formatCost(budget, prefs)}
        />
      ) : null}

      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Total Tokens"
        text={formatNumber(data.totalTokens)}
        icon={{ source: Icon.Coins, tintColor: Color.SecondaryText }}
      />
      <Detail.Metadata.Label
        title="Input"
        text={formatNumber(data.inputTokens)}
      />
      <Detail.Metadata.Label
        title="Output"
        text={formatNumber(data.outputTokens)}
      />
      <Detail.Metadata.Label
        title="Cache Creation"
        text={formatNumber(data.cacheCreationTokens)}
      />
      <Detail.Metadata.Label
        title="Cache Read"
        text={formatNumber(data.cacheReadTokens)}
      />

      {models.length > 0 ? (
        <>
          <Detail.Metadata.Separator />
          {models.map((m) => (
            <Detail.Metadata.Label
              key={m.model || "unknown"}
              title={shortModelName(m.model)}
              text={`${formatCost(m.costUSD, prefs)} · ${formatNumber(m.totalTokens)} tok`}
              icon={{
                source: Icon.CircleFilled,
                tintColor: modelFamilyColor(m.model),
              }}
            />
          ))}
          {hidden > 0 ? (
            <Detail.Metadata.Label title="By Model" text={`+${hidden} more`} />
          ) : null}
        </>
      ) : null}

      <Detail.Metadata.Separator />
      <Detail.Metadata.Label
        title="Source"
        text={abbrevHome(apiConfigDir)}
        icon={{ source: Icon.Folder, tintColor: Color.SecondaryText }}
      />
      <Detail.Metadata.Label title="Source" text={SOURCE_DISCLAIMER} />
    </Detail.Metadata>
  );
}
