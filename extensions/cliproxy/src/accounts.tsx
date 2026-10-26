import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Image,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { getProgressIcon, useCachedPromise, useCachedState } from "@raycast/utils";
import {
  ApiError,
  AuthFile,
  baseUrl,
  clearCooldown,
  ConnectionId,
  connectionId,
  describeRefresh,
  listAuthFiles,
  refreshAllAuthFiles,
  refreshAuthFile,
  setAuthFileDisabled,
} from "./api";
import { canUseReset, percentLeft, QuotaAccount, QuotaResult, spendReset, supportsQuota } from "./quota";
import { fetchAllQuotas } from "./history";
import { UsageView } from "./usageView";
import { providerOverviewMarkdown, quotaChartMarkdown, remainingHex } from "./quotaChart";

/**
 * "details": list + detail pane per account. "limits": one line per account with every limit inline.
 * "overview": one item per provider with summed limits. "forecast" and "drain": full-width timelines.
 */
type View = "details" | "limits" | "overview" | "forecast" | "drain";

const VIEWS: { value: View; title: string; icon: Icon }[] = [
  { value: "details", title: "Details", icon: Icon.Sidebar },
  { value: "limits", title: "Limits", icon: Icon.Gauge },
  { value: "overview", title: "Overview", icon: Icon.BarChart },
  { value: "forecast", title: "Forecast", icon: Icon.LineChart },
  { value: "drain", title: "Drain Rate", icon: Icon.Waveform },
];

export default function Command() {
  // Remount when the server or key changes, so no kept data or in-flight result from the old connection carries over.
  // Callbacks still held from the old render pass its connection, which the API then refuses.
  const connection = connectionId();
  return <Accounts key={connection} connection={connection} />;
}

function Accounts({ connection }: { connection: ConnectionId }) {
  const [view, setView] = useCachedState<View>("view", "details");
  const files = useCachedPromise(listAuthFiles, [connection]);

  // Key quota fetching on stable fields only, so status changes don't re-hit upstream.
  const quotaAccounts: QuotaAccount[] = (files.data ?? [])
    .filter(supportsQuota)
    .map(({ id, auth_index, provider, id_token }) => ({ id, auth_index, provider, id_token }));
  const quotas = useCachedPromise(fetchAllQuotas, [connection, quotaAccounts], {
    execute: quotaAccounts.length > 0,
    keepPreviousData: true,
  });

  const reloadAll = () => {
    files.revalidate();
    quotas.revalidate();
  };

  const refreshAll = () =>
    withToast("Refreshing all accounts…", async () => {
      const results = await refreshAllAuthFiles(connection);
      reloadAll();
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        const names = failed.map((r) => accountTitle(files.data?.find((f) => f.id === r.id)) ?? r.id);
        throw new Error(`${describeRefresh(results)}. Failed: ${names.join(", ")}`);
      }
      return describeRefresh(results);
    });

  if (files.error && !files.data) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.Plug, tintColor: Color.Red }}
          title={
            files.error instanceof ApiError && files.error.status === 401 ? "Invalid management key" : "Can't connect"
          }
          description={files.error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={files.revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <OpenManagementCenterAction />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const byProvider = groupBy(files.data ?? [], (f) => f.provider || "other");
  const nextView = VIEWS[(VIEWS.findIndex((v) => v.value === view) + 1) % VIEWS.length];
  const actions: ListActions = {
    connection,
    view,
    nextView,
    switchView: () => setView(nextView.value),
    setView,
    reloadAll,
    refreshAll,
    reloadFiles: files.revalidate,
  };

  if (view === "forecast" || view === "drain") {
    return (
      <UsageView
        connection={connection}
        mode={view}
        accounts={quotaAccounts}
        quotas={quotas.data?.quotas ?? {}}
        historyError={quotas.data?.historyError ?? null}
        loading={files.isLoading || quotas.isLoading}
        reload={reloadAll}
        toggle={() => setView(view === "forecast" ? "drain" : "forecast")}
        showAccounts={setView}
        actions={
          <>
            <Action
              title={`Show ${nextView.title}`}
              icon={nextView.icon}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={actions.switchView}
            />
            <OpenManagementCenterAction />
          </>
        }
      />
    );
  }

  return (
    <List
      isLoading={files.isLoading || quotas.isLoading}
      isShowingDetail={view !== "limits" && (files.data?.length ?? 0) > 0}
      searchBarPlaceholder="Search accounts"
      searchBarAccessory={
        <List.Dropdown tooltip="View" value={view} onChange={(value) => setView(value as View)}>
          {VIEWS.map((v) => (
            <List.Dropdown.Item key={v.value} title={v.title} value={v.value} icon={v.icon} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Person}
        title="No auth files"
        description="Log in to a provider in CLIProxyAPI first"
      />
      {view === "overview"
        ? Object.entries(byProvider)
            .filter(([, accounts]) => accounts.some(supportsQuota))
            .map(([provider, accounts]) => (
              <ProviderItem
                key={provider}
                provider={provider}
                accounts={accounts}
                quotas={quotas.data?.quotas}
                loading={quotas.isLoading}
                actions={actions}
              />
            ))
        : Object.entries(byProvider).map(([provider, accounts]) => (
            <List.Section
              key={provider}
              title={providerTitle(provider)}
              subtitle={sectionSubtitle(accounts, quotas.data?.quotas)}
            >
              {accounts.map((file) => (
                <AccountItem
                  key={file.id}
                  file={file}
                  result={quotas.data?.quotas?.[file.auth_index]}
                  quotaLoading={supportsQuota(file) && !quotas.data?.quotas?.[file.auth_index] && quotas.isLoading}
                  actions={actions}
                />
              ))}
            </List.Section>
          ))}
    </List>
  );
}

type ListActions = {
  connection: ConnectionId;
  view: View;
  nextView: (typeof VIEWS)[number];
  switchView: () => void;
  setView: (view: View) => void;
  reloadAll: () => void;
  refreshAll: () => void;
  reloadFiles: () => void;
};

type AccountProps = { file: AuthFile; result?: QuotaResult; quotaLoading: boolean };

function AccountItem(props: AccountProps & { actions: ListActions }) {
  const { file, actions } = props;
  const quota = props.result?.quota ?? undefined;
  const status = accountStatus(file);
  const cooldowns = activeCooldowns(file);

  const refresh = () =>
    withToast(`Refreshing ${accountTitle(file)}…`, async () => {
      await refreshAuthFile(actions.connection, file);
      actions.reloadAll();
      return "Account refreshed";
    });

  const toggleDisabled = () =>
    withToast(file.disabled ? "Enabling account…" : "Disabling account…", async () => {
      await setAuthFileDisabled(actions.connection, file, !file.disabled);
      actions.reloadAll();
      return file.disabled ? "Account enabled" : "Account disabled";
    });

  const clearCooldowns = async () => {
    const confirmed = await confirmAlert({
      title: "Clear Cooldown?",
      message: `CLIProxyAPI will route requests to ${accountTitle(file)} again right away. Upstream limits are not changed.`,
      icon: { source: Icon.Clock, tintColor: Color.Orange },
      primaryAction: { title: "Clear Cooldown", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await withToast("Clearing cooldown…", async () => {
      await clearCooldown(actions.connection, file.auth_index);
      actions.reloadFiles();
      return "Cooldown cleared";
    });
  };

  const useReset = async () => {
    const offer = quota?.reset;
    const remaining =
      offer?.kind === "codex" ? `${offer.available} reset credits` : `${offer?.grantsLeft ?? 0} reset grants`;
    const confirmed = await confirmAlert({
      title: "Use Rate-Limit Reset?",
      message: `This spends one of ${remaining} on ${accountTitle(file)} and can't be undone.`,
      icon: { source: Icon.RotateAntiClockwise, tintColor: Color.Red },
      primaryAction: { title: "Use Reset", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await withToast("Resetting rate limits…", async () => {
      const message = await spendReset(actions.connection, file);
      actions.reloadAll();
      return message;
    });
  };

  return (
    <List.Item
      title={accountTitle(file) ?? file.name}
      subtitle={actions.view === "limits" && quota?.plan ? titleCase(quota.plan) : undefined}
      keywords={[file.provider, file.name]}
      icon={{ value: providerIcon(file.provider), tooltip: status.label }}
      accessories={actions.view === "limits" ? limitAccessories(props, status, cooldowns.length) : undefined}
      detail={actions.view === "details" ? <AccountDetail {...props} status={status} /> : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Refresh Account" icon={Icon.ArrowClockwise} onAction={refresh} />
            <CommonActions actions={actions} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Resets">
            {canUseReset(quota?.reset) && (
              <Action
                title="Use Rate-Limit Reset"
                icon={Icon.RotateAntiClockwise}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                onAction={useReset}
              />
            )}
            {(cooldowns.length > 0 || file.unavailable) && (
              <Action
                title="Clear Cooldown"
                icon={Icon.Clock}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                onAction={clearCooldowns}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={file.disabled ? "Enable Account" : "Disable Account"}
              icon={file.disabled ? Icon.CheckCircle : Icon.MinusCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              onAction={toggleDisabled}
            />
            {file.email && (
              <Action.CopyToClipboard
                title="Copy Email"
                content={file.email}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            )}
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** Actions available on every item: refresh, reload, switch view, open the web UI. */
function CommonActions({ actions }: { actions: ListActions }) {
  return (
    <>
      <Action
        title="Refresh All Accounts"
        icon={Icon.Repeat}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={actions.refreshAll}
      />
      <Action
        title="Reload Quota"
        icon={Icon.Gauge}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        onAction={actions.reloadAll}
      />
      <ViewActions actions={actions} />
      <OpenManagementCenterAction />
    </>
  );
}

function ViewActions({ actions }: { actions: ListActions }) {
  return (
    <>
      <Action
        title={`Show ${actions.nextView.title}`}
        icon={actions.nextView.icon}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={actions.switchView}
      />
      <ActionPanel.Submenu title="Switch View" icon={Icon.AppWindow}>
        {VIEWS.map((v) => (
          <Action key={v.value} title={v.title} icon={v.icon} onAction={() => actions.setView(v.value)} />
        ))}
      </ActionPanel.Submenu>
      {actions.view !== "forecast" && actions.view !== "drain" && (
        <Action
          title="Show Forecast"
          icon={Icon.LineChart}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={() => actions.setView("forecast")}
        />
      )}
    </>
  );
}

function OpenManagementCenterAction() {
  return (
    <Action.OpenInBrowser
      title="Open Management Center"
      url={`${baseUrl()}/management.html`}
      shortcut={Keyboard.Shortcut.Common.Open}
    />
  );
}

/** Overview view: one provider with summed limits and a bar segment per account. */
function ProviderItem(props: {
  provider: string;
  accounts: AuthFile[];
  quotas: Record<string, QuotaResult> | undefined;
  loading: boolean;
  actions: ListActions;
}) {
  const { provider, accounts, quotas } = props;
  const withQuota = accounts.filter(supportsQuota);
  const windowsPerAccount = withQuota.map((f) => ({ windows: quotas?.[f.auth_index]?.quota?.windows ?? [] }));
  const hasData = windowsPerAccount.some((a) => a.windows.length > 0);
  const rows = accounts.map((file) => ({
    name: accountTitle(file) ?? file.name,
    summary: accountLimitsSummary(file, quotas?.[file.auth_index]),
    statusHex: accountStatus(file).hex,
  }));
  const markdown = hasData
    ? providerOverviewMarkdown(windowsPerAccount, rows)
    : props.loading
      ? "Loading quota…"
      : "No quota data yet.";

  return (
    <List.Item
      title={providerTitle(provider)}
      subtitle={`${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`}
      icon={providerIcon(provider)}
      detail={<List.Item.Detail isLoading={props.loading && !hasData} markdown={markdown} />}
      actions={
        <ActionPanel>
          <CommonActions actions={props.actions} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

/** "Week 55%, 5h 66%" for the overview's per-account rows. */
function accountLimitsSummary(file: AuthFile, result: QuotaResult | undefined): string {
  if (file.disabled) return "Disabled";
  const windows = result?.quota?.windows ?? [];
  if (windows.length === 0) return result?.error ? "Quota unavailable" : "No data";
  const parts = windows.map((w) => `${shortLabel(w.label)} ${Math.round(percentLeft(w) ?? 0)}%`);
  return parts.join(", ") + (result?.error ? " (stale)" : "");
}

function AccountDetail(props: AccountProps & { status: Status }) {
  const { file, status } = props;
  const quota = props.result?.quota ?? undefined;
  const reset = quota?.reset;
  const cooldowns = activeCooldowns(file);
  const M = List.Item.Detail.Metadata;

  return (
    <List.Item.Detail
      isLoading={props.quotaLoading}
      markdown={quotaMarkdown(file, props.result, props.quotaLoading)}
      metadata={
        <M>
          <M.TagList title="Status">
            <M.TagList.Item text={status.label} color={status.color} />
          </M.TagList>
          {file.status_message && status.label !== "Active" && <M.Label title="Message" text={file.status_message} />}
          {quota?.plan && <M.Label title="Plan" text={titleCase(quota.plan)} />}
          {reset?.kind === "codex" && (
            <M.Label
              title="Reset Credits"
              text={`${reset.available} available`}
              icon={reset.available > 0 ? Icon.RotateAntiClockwise : undefined}
            />
          )}
          {reset?.kind === "claude" && (
            <M.Label
              title="Reset Grants"
              text={`${reset.grantsLeft} left · ${reset.blocker ?? "usable now"}`}
              icon={reset.grantId ? Icon.RotateAntiClockwise : undefined}
            />
          )}
          {cooldowns.map((c, i) => (
            <M.Label
              key={i}
              title={i === 0 ? "Cooldowns" : ""}
              text={`${c.scope === "model" ? (c.model_key ?? "Model") : "Whole account"}: ${humanize(c.reason)}, ends ${relative(c.until)}`}
              icon={{ source: Icon.Clock, tintColor: Color.Orange }}
            />
          ))}
          <M.Separator />
          <M.Label title="Requests" text={`${file.success ?? 0} ok · ${file.failed ?? 0} failed`} />
          {file.last_refresh && <M.Label title="Last Refresh" text={relative(Date.parse(file.last_refresh))} />}
          <M.Label title="File" text={file.name} />
        </M>
      }
    />
  );
}

// MARK: Presentation helpers

/** `hex` mirrors `color` for SVG charts, which can't use Raycast colors. */
type Status = { label: string; color: Color; hex: string };

function accountStatus(file: AuthFile): Status {
  if (file.disabled) return { label: "Disabled", color: Color.SecondaryText, hex: "#8E8E93" };
  if (activeCooldowns(file).some((c) => c.scope === "credential"))
    return { label: "Cooling Down", color: Color.Orange, hex: "#E8A23A" };
  if (file.unavailable || file.status === "error") return { label: "Unavailable", color: Color.Red, hex: "#E5534B" };
  if (activeCooldowns(file).length > 0) return { label: "Partly Cooling Down", color: Color.Yellow, hex: "#E8C33A" };
  return { label: "Active", color: Color.Green, hex: "#4CA67A" };
}

function activeCooldowns(file: AuthFile) {
  const now = Date.now();
  return (file.cooldowns ?? []).filter((c) => c.until > now);
}

function quotaMarkdown(file: AuthFile, result: QuotaResult | undefined, loading: boolean): string {
  if (!supportsQuota(file)) {
    return file.disabled ? "Account is disabled." : `${providerTitle(file.provider)} doesn't report quota.`;
  }
  if (!result) return loading ? "Loading quota…" : "";
  const { quota, error, fetchedAt } = result;
  if (!quota) return `**Quota unavailable**\n\n${error ?? "No data"}`;
  const chart = quota.windows.length > 0 ? quotaChartMarkdown(quota.windows) : "No quota windows reported.";
  if (!error) return chart;
  return `${chart}\n\n_Couldn't refresh (${error}). Showing data from ${relative(fetchedAt ?? NaN)}._`;
}

/** Limits view: one progress ring per quota window, plus warnings and the next relevant reset. */
function limitAccessories(
  { file, result, quotaLoading }: AccountProps,
  status: Status,
  cooldownCount: number,
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (file.disabled) return [{ tag: "Disabled" }];
  if (quotaLoading) return [{ text: "Loading…" }];

  // Status icons come first so they sit closest to the account name, before the limit rings.
  if (status.label === "Unavailable") {
    accessories.push({
      icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
      tooltip: file.status_message || "Unavailable",
    });
  }

  if (result?.error) {
    const stale = result.fetchedAt ? ` Showing data from ${relative(result.fetchedAt)}.` : "";
    accessories.push({
      icon: { source: Icon.Warning, tintColor: Color.Orange },
      tooltip: `Couldn't refresh: ${result.error}.${stale}`,
    });
  }
  if (cooldownCount > 0) {
    accessories.push({ icon: { source: Icon.Clock, tintColor: Color.Orange }, tooltip: `${cooldownCount} cooldowns` });
  }
  if (canUseReset(result?.quota?.reset)) {
    accessories.push({ icon: Icon.RotateAntiClockwise, tooltip: "Rate-limit reset available" });
  }

  const windows = result?.quota?.windows ?? [];
  for (const window of windows) {
    const raw = percentLeft(window);
    if (raw === null) continue;
    const left = Math.round(raw);
    const reset = window.resetsAt ? `, resets ${relative(window.resetsAt)}` : "";
    accessories.push({
      icon: getProgressIcon(left / 100, remainingHex(left)),
      text: `${shortLabel(window.label)} ${left}%`,
      tooltip: `${window.label}: ${left}% left${reset}`,
    });
  }

  // When a limit is (nearly) exhausted, the reset that matters is the latest one among those limits.
  const blocking = windows.filter((w) => (percentLeft(w) ?? 100) <= 10 && w.resetsAt);
  const until = Math.max(...blocking.map((w) => w.resetsAt ?? 0));
  if (blocking.length > 0) {
    accessories.push({ icon: Icon.Clock, text: relative(until), tooltip: "Until the exhausted limits reset" });
  }

  if (accessories.length === 0 && !supportsQuota(file)) accessories.push({ text: "No quota info" });
  return accessories;
}

/** e.g. "4 accounts · W 123% / 300%": remaining weekly capacity summed across accounts with data. */
function sectionSubtitle(accounts: AuthFile[], quotas: Record<string, QuotaResult> | undefined): string {
  const count = `${accounts.length} ${accounts.length === 1 ? "account" : "accounts"}`;
  const weekly = accounts
    .map((f) => quotas?.[f.auth_index]?.quota?.windows.find((w) => w.label === "Weekly"))
    .map((w) => (w ? percentLeft(w) : null))
    .filter((v): v is number => v !== null);
  if (weekly.length === 0) return count;
  const left = Math.round(weekly.reduce((sum, value) => sum + value, 0));
  return `${count} · W ${left}% / ${weekly.length * 100}%`;
}

/** Bundled Management Center logos; monochrome marks follow Raycast’s text color. */
function providerIcon(provider: string): Image.ImageLike {
  if (provider === "claude") return { source: "claude.svg" };
  if (provider === "codex") return { source: "openai.svg", tintColor: Color.PrimaryText };
  if (provider === "antigravity") return { source: "antigravity.svg" };
  if (provider === "meta") return { source: "meta.svg" };
  if (provider === "xai") return { source: "xai.svg", tintColor: Color.PrimaryText };
  return Icon.Person;
}

function shortLabel(label: string): string {
  if (label === "5-Hour") return "5h";
  if (label === "Weekly") return "Week";
  if (label === "Monthly") return "Month";
  return label.replace(/^Weekly /, "");
}

function accountTitle(file: AuthFile | undefined): string | undefined {
  return file?.email || file?.label || file?.name;
}

function providerTitle(provider: string): string {
  return provider === "codex"
    ? "Codex"
    : provider === "claude"
      ? "Claude"
      : provider === "xai"
        ? "xAI"
        : titleCase(provider);
}

function titleCase(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanize(reason: string): string {
  return reason.replace(/_/g, " ");
}

/** "in 2h 13m" / "5m ago" relative to now. */
function relative(ms: number): string {
  if (Number.isNaN(ms)) return "unknown";
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60_000);
  let text: string;
  if (minutes < 1) text = "<1m";
  else if (minutes < 60) text = `${minutes}m`;
  else if (minutes < 48 * 60) text = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  else text = `${Math.round(minutes / 1440)}d`;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) (groups[key(item)] ??= []).push(item);
  return groups;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Run a mutation behind an animated toast; the callback's return value becomes the success title. */
async function withToast(pending: string, fn: () => Promise<string>) {
  const toast = await showToast({ style: Toast.Style.Animated, title: pending });
  try {
    toast.title = await fn();
    toast.style = Toast.Style.Success;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = errorMessage(error);
  }
}
