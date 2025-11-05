import { List, Action, ActionPanel, Icon, showToast, Toast, WindowManagement, LocalStorage } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { getPlatformAdapter, ProgramInfo, PlatformMode } from "./platform";

const API_ACCESS_CACHE_KEY = "windowManagementApiAccess";
const FILTER_VALUE_CACHE_KEY = "monitorFilterValue";

const TOAST_SUCCESS_DURATION = 1500;
const TOAST_ERROR_DURATION = 3000;
const platformAdapter = getPlatformAdapter();

export default function Command() {
  const [programs, setPrograms] = useState<ProgramInfo[]>([]);
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
    loadPrograms();
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

  async function loadPrograms(showRefreshToast: boolean = false) {
    // Prevent concurrent loads
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;

    // Show animated toast while loading
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: showRefreshToast ? "Refreshing programs..." : "Loading programs...",
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

      let programList: ProgramInfo[];

      if (mode === PlatformMode.API) {
        programList = await platformAdapter.getProgramsAPI();
      } else {
        const options: Record<string, unknown> = {};
        if (filterOptions) {
          options.showAllMonitors = filterValue === "all";
        }
        programList = await platformAdapter.getProgramsNative(options);
      }

      setPrograms(programList);

      // Update toast to success
      loadingToast.style = Toast.Style.Success;
      loadingToast.title = showRefreshToast
        ? `Refreshed ${programList.length} program${programList.length !== 1 ? "s" : ""}`
        : `Loaded ${programList.length} program${programList.length !== 1 ? "s" : ""}`;

      // Auto-hide success toast
      setTimeout(() => loadingToast.hide(), TOAST_SUCCESS_DURATION);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Update toast to failure
      loadingToast.style = Toast.Style.Failure;
      loadingToast.title = showRefreshToast ? "Failed to refresh" : "Failed to load programs";
      loadingToast.message = err instanceof Error ? err.message : String(err);
      setTimeout(() => loadingToast.hide(), TOAST_ERROR_DURATION);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }

  async function switchToProgram(programId: string, programTitle: string) {
    try {
      await platformAdapter.switchToProgram(programId, programTitle);
    } catch {
      // Error handling is done in platform adapter
    }
  }

  async function closeProgram(programId: string, programTitle: string) {
    try {
      await platformAdapter.closeProgram(programId, programTitle);
      // Refresh the list after closing
      await loadPrograms(true);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to close program",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function resetApiCache() {
    await LocalStorage.removeItem(API_ACCESS_CACHE_KEY);
    setMode(null);
    setApiCheckMessage("Rechecking API access...");
    await loadPrograms();
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
          title="Error Loading Programs"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={loadPrograms} />
              <Action title="Reset API Cache" icon={Icon.Trash} onAction={resetApiCache} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const modeText = mode === PlatformMode.API ? "API Mode" : "Native Mode";
  const filterText = filterValue === "all" ? "All Desktops" : "Current Desktop";
  const programCountText =
    mode === PlatformMode.NATIVE && filterOptions
      ? `${programs.length} program${programs.length !== 1 ? "s" : ""} • ${filterText} • ${modeText}`
      : `${programs.length} program${programs.length !== 1 ? "s" : ""} • ${modeText}`;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search open programs..."
      navigationTitle={programCountText}
      searchBarAccessory={
        // Only show dropdown if platform supports filtering and filter is loaded
        filterOptions && mode === PlatformMode.NATIVE && filterValue !== null ? (
          <List.Dropdown
            tooltip="Filter Programs"
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
      {programs.length === 0 ? (
        <List.EmptyView
          icon={isLoading ? { source: "extension-icon.png" } : Icon.Window}
          title={isLoading ? "Scanning Running Programs..." : "No Programs Found"}
          description={isLoading ? "Please wait..." : "Could not find any running programs."}
        />
      ) : (
        <List.Section title="The list does not get updated automatically. Use action or Alt+R to refresh.">
          {programs.map((program) => (
            <List.Item
              key={program.id}
              title={program.title}
              icon={platformAdapter.getProgramIcon(program)}
              keywords={[program.appName, program.title]}
              accessories={[
                ...(program.isActive ? [{ tag: { value: "Active", color: "#00FF00" } }] : []),
                { text: program.appName },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Switch to Program"
                    icon={Icon.Window}
                    onAction={() => switchToProgram(program.id, program.title)}
                  />
                  <Action
                    title="Close Program"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["alt"], key: "x" }}
                    onAction={() => closeProgram(program.id, program.title)}
                  />
                  <Action
                    title="Refresh List"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["alt"], key: "r" }}
                    onAction={() => loadPrograms(true)}
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
