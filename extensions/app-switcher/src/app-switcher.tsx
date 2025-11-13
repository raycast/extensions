import { List, Action, ActionPanel, Icon, showToast, Toast, WindowManagement, LocalStorage } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { getPlatformAdapter, AppInfo, PlatformMode } from "./platform";

const API_ACCESS_CACHE_KEY = "windowManagementApiAccess";
const FILTER_VALUE_CACHE_KEY = "monitorFilterValue";

const TOAST_SUCCESS_DURATION = 1500;
const TOAST_ERROR_DURATION = 3000;
const platformAdapter = getPlatformAdapter();

export default function Command() {
  const [applications, setApplications] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [filterValue, setFilterValue] = useState<string | null>(null);
  const [mode, setMode] = useState<PlatformMode | null>(null);
  const [, setApiCheckMessage] = useState("");
  const isLoadingRef = useRef(false);

  const filterOptions = platformAdapter.getFilterOptions(filterValue || undefined);

  // Load saved filter value on mount
  useEffect(() => {
    async function init() {
      const saved = await LocalStorage.getItem<string>(FILTER_VALUE_CACHE_KEY);
      const initialValue = saved || "all";
      setFilterValue(initialValue);
    }
    init();
  }, []);

  // Refresh once when extension becomes visible again
  useEffect(() => {
    if (filterValue === null) return;
    // Initial load and whenever filter/mode changes
    loadApps();
  }, [filterValue, mode]);

  async function checkApiAccess(): Promise<PlatformMode> {
    // Check cache first
    const cached = await LocalStorage.getItem<string>(API_ACCESS_CACHE_KEY);
    if (cached !== undefined) {
      const useApi = cached === "true";
      setApiCheckMessage(useApi ? "Using WindowManagement API" : "Using native platform API");
      return useApi ? PlatformMode.API : PlatformMode.NATIVE;
    }

    // Try to use the API (beta users might have access even if canAccess returns false)
    try {
      await WindowManagement.getActiveWindow();
      await LocalStorage.setItem(API_ACCESS_CACHE_KEY, "true");
      setApiCheckMessage("Using WindowManagement API");
      return PlatformMode.API;
    } catch {
      setApiCheckMessage("Using native platform API");
      return PlatformMode.NATIVE;
    }
  }

  async function loadApps(showRefreshToast: boolean = false) {
    // Prevent concurrent loads
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;

    // Show animated toast while loading
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: showRefreshToast ? "Refreshing apps..." : "Loading apps...",
    });

    try {
      setIsLoading(true);
      setError(undefined);

      // Check API access on first load
      if (mode === null) {
        const detectedMode = await checkApiAccess();
        setMode(detectedMode);
        loadingToast.hide();
        isLoadingRef.current = false;
        return;
      }

      let appList: AppInfo[];

      if (mode === PlatformMode.API) {
        appList = await platformAdapter.getAppsAPI();
      } else {
        const options: Record<string, unknown> = {};
        if (filterOptions) {
          options.showAllMonitors = filterValue === "all";
        }
        appList = await platformAdapter.getAppsNative(options);
      }

      setApplications(appList);

      // Update toast to success
      loadingToast.style = Toast.Style.Success;
      loadingToast.title = showRefreshToast
        ? `Refreshed ${appList.length} app${appList.length !== 1 ? "s" : ""}`
        : `Loaded ${appList.length} app${appList.length !== 1 ? "s" : ""}`;

      // Auto-hide success toast
      setTimeout(() => loadingToast.hide(), TOAST_SUCCESS_DURATION);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Update toast to failure
      loadingToast.style = Toast.Style.Failure;
      loadingToast.title = showRefreshToast ? "Failed to refresh" : "Failed to load apps";
      loadingToast.message = err instanceof Error ? err.message : String(err);
      setTimeout(() => loadingToast.hide(), TOAST_ERROR_DURATION);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }

  async function switchToApp(appId: string, appTitle: string) {
    try {
      await platformAdapter.switchToApp(appId, appTitle);
    } catch {
      // Error handling is done in platform adapter
    }
  }

  async function closeApp(appId: string, appTitle: string) {
    try {
      await platformAdapter.closeApp(appId, appTitle);
      // Refresh the list after closing
      await loadApps(true);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to close app",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function resetApiCache() {
    await LocalStorage.removeItem(API_ACCESS_CACHE_KEY);
    setMode(null);
    setApiCheckMessage("Rechecking API access...");
    await loadApps();
  }

  async function toggleMode() {
    const newMode = mode === PlatformMode.API ? PlatformMode.NATIVE : PlatformMode.API;
    setMode(newMode);
    await LocalStorage.setItem(API_ACCESS_CACHE_KEY, newMode === PlatformMode.API ? "true" : "false");
    setApiCheckMessage(
      newMode === PlatformMode.API ? "Forced to WindowManagement API" : "Forced to native platform API",
    );
    // Don't use showHUD as it closes the window - just update state and show toast
    const toast = await showToast({
      style: Toast.Style.Success,
      title: newMode === PlatformMode.API ? "Switched to API Mode" : "Switched to Native Mode",
    });
    // Auto-hide toast
    setTimeout(() => toast.hide(), TOAST_SUCCESS_DURATION);
  }

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Error Loading Apps"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadApps} />
              <Action title="Reset API Cache" icon={Icon.Trash} onAction={resetApiCache} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const modeText = mode === PlatformMode.API ? "API Mode" : "Native Mode";
  const filterText = filterValue === "all" ? "All Desktops" : "Current Desktop";
  const appCountText =
    mode === PlatformMode.NATIVE && filterOptions
      ? `${applications.length} app${applications.length !== 1 ? "s" : ""} • ${filterText} • ${modeText}`
      : `${applications.length} app${applications.length !== 1 ? "s" : ""} • ${modeText}`;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search open apps..."
      navigationTitle={appCountText}
      searchBarAccessory={
        // Only show dropdown if platform supports filtering and filter is loaded
        filterOptions && mode === PlatformMode.NATIVE && filterValue !== null ? (
          <List.Dropdown
            tooltip="Filter Apps"
            defaultValue={filterValue}
            onChange={async (newValue) => {
              // Ignore empty string or same value
              if (!newValue || newValue === filterValue) return;

              // Update state and save immediately
              setFilterValue(newValue);
              await LocalStorage.setItem(FILTER_VALUE_CACHE_KEY, newValue);
            }}
          >
            {filterOptions.map((option) => (
              <List.Dropdown.Item key={option.value} title={option.label} value={option.value} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {applications.length === 0 ? (
        <List.EmptyView
          icon={isLoading ? { source: "extension-icon.png" } : Icon.Window}
          title={isLoading ? "Scanning Running Apps..." : "No Apps Found"}
          description={isLoading ? "Please wait..." : "Could not find any running apps."}
        />
      ) : (
        <List.Section title="The list does not get updated automatically. Use action or Alt+R to refresh.">
          {applications.map((app) => (
            <List.Item
              key={app.id}
              title={app.title}
              icon={platformAdapter.getAppIcon(app)}
              keywords={[app.appName, app.title]}
              accessories={[
                ...(app.isActive ? [{ tag: { value: "Active", color: "#00FF00" } }] : []),
                { text: app.appName },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Switch to App" icon={Icon.Window} onAction={() => switchToApp(app.id, app.title)} />
                  <Action
                    title="Close App"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["alt"], key: "x" }}
                    onAction={() => closeApp(app.id, app.title)}
                  />
                  <Action
                    title="Refresh List"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["alt"], key: "r" }}
                    onAction={() => loadApps(true)}
                  />
                  <Action
                    title={mode === PlatformMode.API ? "Switch to Native Mode" : "Switch to API Mode"}
                    icon={Icon.Switch}
                    shortcut={{ modifiers: ["alt"], key: "t" }}
                    onAction={toggleMode}
                  />
                  <Action
                    title="Reset API Cache & Recheck"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["alt", "shift"], key: "r" }}
                    onAction={resetApiCache}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
