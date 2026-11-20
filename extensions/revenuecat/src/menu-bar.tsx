import {
  Cache,
  Clipboard,
  Color,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useResource } from "./hooks/data";
import { credential } from "./lib/auth";
import { metricGroups, metricTitle, sortedMetrics } from "./lib/dashboard-metrics";
import {
  loadMenuBarOverview,
  MenuBarOverview,
  selectedMenuBarMetric,
  menuBarCacheKey,
  matchingMenuBarOverview,
} from "./lib/menu-bar";
import { cachedSelectedProject, selectedProject, saveSelectedProject } from "./lib/project-selection";
import { demoProject } from "./lib/demo";
import { formatMetric, periodLabel, RevenueCatClient } from "./lib/revenuecat";

const overviewCache = new Cache({ namespace: "menu-bar-overview-v2" });
function cachedOverview(key: string, projectId: string | undefined): MenuBarOverview | undefined {
  const cached = overviewCache.get(key);
  if (!cached) return undefined;
  try {
    return matchingMenuBarOverview(JSON.parse(cached), projectId);
  } catch {
    overviewCache.remove(key);
    return undefined;
  }
}

const openDashboard = () => launchCommand({ name: "dashboard", type: LaunchType.UserInitiated });

export default function Command() {
  const preferences = getPreferenceValues<Preferences.MenuBar>();
  const selectedProjectId = preferences.demoMode ? demoProject.id : cachedSelectedProject();
  const cacheKey = menuBarCacheKey({
    projectId: selectedProjectId,
    demo: preferences.demoMode,
    currency: preferences.currency || "USD",
    chartsV3: preferences.chartsV3 ?? true,
  });
  const state = useResource(cacheKey, async (signal) => {
    const requestedProjectId = preferences.demoMode ? demoProject.id : await selectedProject();
    // Read/refresh existing tokens only. A background launch must never start OAuth.
    const data = await loadMenuBarOverview(
      new RevenueCatClient(credential),
      {
        demo: preferences.demoMode,
        currency: preferences.currency || "USD",
        chartsV3: preferences.chartsV3 ?? true,
        selectedProjectId: requestedProjectId,
      },
      signal,
    );
    signal.throwIfAborted();
    overviewCache.set(
      menuBarCacheKey({
        projectId: data.project.id,
        demo: preferences.demoMode,
        currency: preferences.currency || "USD",
        chartsV3: preferences.chartsV3 ?? true,
      }),
      JSON.stringify(data),
    );
    // Remember the initial/fallback project only if no picker changed it while
    // the request was in flight. Never publish old results under a new key.
    if (
      !preferences.demoMode &&
      data.project.id !== requestedProjectId &&
      (await selectedProject()) === requestedProjectId
    ) {
      signal.throwIfAborted();
      await saveSelectedProject(data.project.id);
    }
    return data;
  });
  // Raycast restarts menu bar commands when their menu opens. Read the cache
  // synchronously so even the first render keeps the previous title and menu.
  const data = matchingMenuBarOverview(state.data, selectedProjectId) ?? cachedOverview(cacheKey, selectedProjectId);
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
                    await saveSelectedProject(project.id);
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
