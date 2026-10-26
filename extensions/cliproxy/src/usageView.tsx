import { Action, ActionPanel, Detail, environment, Icon, Keyboard } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { chartChoices } from "./chartChoices";
import { ConnectionId } from "./api";
import { accountKey, historyStore, observations } from "./history";
import { QuotaAccount, QuotaResult } from "./quota";
import { accountRates, DAY, drainHistory, forecast, HOUR, remainingHistory } from "./usageModel";
import { usageChartSvg } from "./usageChart";

export function UsageView(props: {
  connection: ConnectionId;
  mode: "forecast" | "drain";
  accounts: QuotaAccount[];
  quotas: Record<string, QuotaResult>;
  historyError: string | null;
  loading: boolean;
  reload: () => void;
  toggle: () => void;
  showAccounts: (view: "details" | "limits" | "overview") => void;
  actions: Parameters<typeof Detail>[0]["actions"];
}) {
  const [provider, setProvider] = useCachedState("chart-provider", "claude");
  const [window, setWindow] = useCachedState("chart-window", "Weekly");
  const [forecastDays, setForecastDays] = useCachedState("chart-forecast-days", 7);
  const [historyDays, setHistoryDays] = useCachedState("chart-history-days", 1);
  const days = props.mode === "forecast" ? forecastDays : historyDays;
  const setDays = props.mode === "forecast" ? setForecastDays : setHistoryDays;
  const read = async (connection: ConnectionId, revision: number) =>
    historyStore(connection).read(Math.max(Date.now(), revision));
  const revision = Math.max(0, ...Object.values(props.quotas).map((q) => q.fetchedAt ?? 0));
  const history = usePromise(read, [props.connection, revision]);
  const latest = observations(props.accounts, props.quotas);
  const providers = [...new Set(props.accounts.map((a) => a.provider))];
  const selectedProvider = providers.includes(provider) ? provider : (providers[0] ?? "claude");
  const enabledKeys = new Set(props.accounts.filter((a) => a.provider === selectedProvider).map(accountKey));
  const providerHistory = (history.data ?? []).filter(
    (o) => o.provider === selectedProvider && enabledKeys.has(o.account),
  );
  const availableWindows = props.accounts
    .filter((a) => a.provider === selectedProvider)
    .flatMap((a) => props.quotas[a.auth_index]?.quota?.windows.map((w) => w.label) ?? []);
  const windows = [...new Set([...availableWindows, ...providerHistory.map((o) => o.label)])];
  const selectedWindow = windows.includes(window)
    ? window
    : (windows.find((w) => w === "Weekly") ?? windows[0] ?? "Weekly");
  const current = latest.filter((o) => o.provider === selectedProvider && o.label === selectedWindow);
  const all = providerHistory.filter((o) => o.label === selectedWindow);
  // A failed refresh must not shrink capacity or silently drop an account from the forecast.
  const keys = [
    ...new Set([
      ...all.map((o) => o.account),
      ...props.accounts
        .filter(
          (a) =>
            a.provider === selectedProvider &&
            (props.quotas[a.auth_index]?.quota?.windows.some((w) => w.label === selectedWindow) ||
              props.quotas[a.auth_index]?.error ||
              !props.quotas[a.auth_index]?.quota),
        )
        .map(accountKey),
    ]),
  ];
  const fresh = keys.length === current.length;
  const now = Date.now();
  const rates = accountRates(all, now - 7 * DAY, now);
  const complete =
    keys.length > 0 &&
    keys.every((key) => rates.some((r) => r.account === key && r.observedMs >= HOUR && r.intervals >= 3));
  const mean = complete ? keys.reduce((s, key) => s + rates.find((r) => r.account === key)!.rate, 0) : null;
  const since = props.mode === "forecast" ? now - DAY : now - days * DAY;
  const data = props.mode === "forecast" ? remainingHistory(all, keys, since) : drainHistory(all, keys, since, now);
  const svg = usageChartSvg({
    mode: props.mode,
    provider: selectedProvider,
    label: selectedWindow,
    accounts: keys.length,
    left: fresh ? current.reduce((s, o) => s + o.left, 0) : null,
    rate: mean,
    observedHours: keys.length
      ? keys.reduce((s, key) => s + (rates.find((r) => r.account === key)?.observedMs ?? 0), 0) / keys.length / HOUR
      : 0,
    history: data,
    projection: fresh ? forecast(current, rates, now, days) : null,
    days,
    now,
    since,
    dark: environment.appearance === "dark",
    message:
      props.historyError ??
      (history.error
        ? "Couldn't read history. Reload to try again."
        : !fresh
          ? "Some accounts failed to refresh; projection is paused."
          : current.some((o) => !o.resetsAt || o.resetsAt <= now)
            ? "Unknown reset times are projected without refills."
            : undefined),
  });
  const choices = chartChoices(providers, windows);
  const applyChoice = (value: string) => {
    const [kind, ...parts] = value.split(":");
    const selection = parts.join(":");
    if (kind === "view") props.showAccounts(selection as "details" | "limits" | "overview");
    else if (kind === "provider") setProvider(selection);
    else if (kind === "window") setWindow(selection);
    else if (kind === "forecast" || kind === "drain") {
      (kind === "forecast" ? setForecastDays : setHistoryDays)(Number(selection));
      if (kind !== props.mode) props.toggle();
    }
  };
  const actions = (
    <ActionPanel>
      <Action
        title="Reload Quota"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => {
          props.reload();
          history.revalidate();
        }}
      />
      <Action
        title={props.mode === "forecast" ? "Show Drain Rate" : "Show Forecast"}
        icon={Icon.LineChart}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={props.toggle}
      />
      <Action
        title="Next Provider"
        icon={Icon.Person}
        shortcut={{ modifiers: ["cmd"], key: "j" }}
        onAction={() =>
          setProvider(providers[(providers.indexOf(selectedProvider) + 1) % providers.length] ?? selectedProvider)
        }
      />
      <Action
        title="Next Limit"
        icon={Icon.Gauge}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        onAction={() => setWindow(windows[(windows.indexOf(selectedWindow) + 1) % windows.length] ?? selectedWindow)}
      />
      {props.mode === "drain" && (
        <Action
          title={days === 1 ? "Show Last 7 Days" : "Show Last 24 Hours"}
          shortcut={{ modifiers: ["cmd"], key: "h" }}
          onAction={() => setDays(days === 1 ? 7 : 1)}
        />
      )}
      {props.actions}
      <ActionPanel.Submenu
        title="Chart Options"
        icon={Icon.LineChart}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
      >
        {["Forecast", "Drain Rate", "Provider", "Quota Window"].map((group) => (
          <ActionPanel.Section key={group} title={group}>
            {choices
              .filter((choice) => choice.group === group)
              .map((choice) => (
                <Action
                  key={choice.value}
                  title={choice.title}
                  icon={choiceIcon[choice.icon]}
                  onAction={() => applyChoice(choice.value)}
                />
              ))}
          </ActionPanel.Section>
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu title="Account Views" icon={Icon.AppWindow}>
        {choices
          .filter((choice) => choice.group === "Account Views")
          .map((choice) => (
            <Action
              key={choice.value}
              title={choice.title}
              icon={choiceIcon[choice.icon]}
              onAction={() => applyChoice(choice.value)}
            />
          ))}
      </ActionPanel.Submenu>
    </ActionPanel>
  );
  return (
    <Detail
      navigationTitle={`${selectedProvider === "claude" ? "Claude" : "Codex"} / ${selectedWindow}`}
      isLoading={props.loading || history.isLoading}
      markdown={`![Quota chart](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`}
      actions={actions}
    />
  );
}

const choiceIcon = {
  forecast: Icon.LineChart,
  drain: Icon.Waveform,
  details: Icon.Sidebar,
  limits: Icon.Gauge,
  overview: Icon.BarChart,
  provider: Icon.Person,
  window: Icon.Clock,
};
