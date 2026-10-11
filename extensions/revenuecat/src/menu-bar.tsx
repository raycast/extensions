import {
  Cache,
  Clipboard,
  Color,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useResource } from "./hooks/data";
import { credential } from "./lib/auth";
import { metricGroups, metricTitle, sortedMetrics } from "./lib/dashboard-metrics";
import { loadMenuBarOverview, MenuBarOverview, selectedMenuBarMetric } from "./lib/menu-bar";
import { SELECTED_PROJECT_KEY } from "./lib/project-selection";
import { formatMetric, periodLabel, RevenueCatClient } from "./lib/revenuecat";

const overviewCache = new Cache({ namespace: "menu-bar-overview-v1" });
function cachedOverview(key: string): MenuBarOverview | undefined {
  const cached = overviewCache.get(key);
  if (!cached) return undefined;
  try {
    return JSON.parse(cached) as MenuBarOverview;
  } catch {
    overviewCache.remove(key);
    return undefined;
  }
}

const openDashboard = () => launchCommand({ name: "dashboard", type: LaunchType.UserInitiated });

export default function Command() {
  const preferences = getPreferenceValues<Preferences.MenuBar>();
  const cacheKey = `menu-bar:${preferences.demoMode}:${preferences.currency}:${preferences.chartsV3 ?? true}`;
  const state = useResource(cacheKey, async (signal) => {
    const selectedProjectId = await LocalStorage.getItem<string>(SELECTED_PROJECT_KEY);
    // Read/refresh existing tokens only. A background launch must never start OAuth.
    const data = await loadMenuBarOverview(
      new RevenueCatClient(credential),
      {
        demo: preferences.demoMode,
        currency: preferences.currency || "USD",
        chartsV3: preferences.chartsV3 ?? true,
        selectedProjectId,
      },
      signal,
    );
    signal.throwIfAborted();
    overviewCache.set(cacheKey, JSON.stringify(data));
    return data;
  });
  // Raycast restarts menu bar commands when their menu opens. Read the cache
  // synchronously so even the first render keeps the previous title and menu.
  const data = state.data ?? cachedOverview(cacheKey);
  const metrics = sortedMetrics(data?.overview.metrics || []);
  const metric = selectedMenuBarMetric(metrics, preferences.metric);
  const value =
    metric && data ? (metric.value === null ? "N/A" : formatMetric(metric, data.overview.currency)) : undefined;
  const tooltip = state.error
    ? `RevenueCat: ${state.error}${data ? " Showing last loaded values." : ""}`
    : metric?.unavailableReason
      ? metric.unavailableReason
      : metric && data
        ? `${data.project.name} · ${metricTitle(metric)}: ${value} · ${periodLabel(metric.period)}`
        : state.loading
          ? "Loading RevenueCat metrics…"
          : "Selected metric unavailable. Choose another metric in command settings.";

  return (
    <MenuBarExtra title={value ?? (state.loading ? "…" : "RevenueCat")} tooltip={tooltip} isLoading={state.loading}>
      {state.error && (
        <MenuBarExtra.Item title="Could Not Load Metrics" tooltip={state.error} icon={Icon.ExclamationMark} />
      )}
      {data && (
        <>
          {metricGroups(metrics).map((group) => (
            <MenuBarExtra.Section key={group.title} title={group.title}>
              {group.metrics.map((item) => (
                <MenuBarExtra.Item
                  key={item.id}
                  title={metricTitle(item)}
                  subtitle={formatMetric(item, data.overview.currency)}
                  icon={{
                    source:
                      group.title === "Revenue"
                        ? Icon.BankNote
                        : group.title === "Customers"
                          ? Icon.TwoPeople
                          : Icon.BarChart,
                    tintColor:
                      group.title === "Revenue" ? Color.Green : item.id.includes("trial") ? Color.Orange : Color.Blue,
                  }}
                  tooltip={item.unavailableReason ?? `${periodLabel(item.period)} · Click to copy value`}
                  onAction={
                    item.value === null ? undefined : () => Clipboard.copy(formatMetric(item, data.overview.currency))
                  }
                />
              ))}
            </MenuBarExtra.Section>
          ))}
          {data.projects.length > 1 && (
            <MenuBarExtra.Submenu title="Project" icon={Icon.Folder}>
              {data.projects.map((project) => (
                <MenuBarExtra.Item
                  key={project.id}
                  title={project.name}
                  icon={project.id === data.project.id ? Icon.Checkmark : undefined}
                  onAction={async () => {
                    await LocalStorage.setItem(SELECTED_PROJECT_KEY, project.id);
                    state.refresh();
                  }}
                />
              ))}
            </MenuBarExtra.Submenu>
          )}
        </>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Open Dashboard" icon={Icon.AppWindow} onAction={openDashboard} />
        <MenuBarExtra.Item
          title="Open in RevenueCat"
          icon={Icon.Globe}
          onAction={() => open("https://app.revenuecat.com")}
        />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={state.refresh} />
        <MenuBarExtra.Item title="Settings" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
