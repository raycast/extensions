import { useState, useEffect, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  LocalStorage,
  useNavigation,
} from "@raycast/api";
import { checkGcloudStatus, GcloudStatusType } from "./utils";
import { SearchMode } from "./types";
import { useSearchHistory } from "./hooks/useSearchHistory";
import { CustomProjectsForm } from "./components/CustomProjectsForm";
import { ResultsView } from "./components/ResultsView";
import {
  ConfigureProjectsAction,
  SwitchModeAction,
} from "./components/SearchActions";

// IP validation helper function
function isValidIP(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 regex (simplified - covers most common cases)
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,7}:)|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

function SearchCommand() {
  const [searchText, setSearchText] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("quick");
  const [customProjects, setCustomProjects] = useState<string>("");
  const [gcloudStatus, setGcloudStatus] = useState<GcloudStatusType>({
    type: "loading",
    message: "Checking gcloud...",
  });

  const {
    history,
    isLoading: isHistoryLoading,
    addToHistory,
    removeFromHistory,
  } = useSearchHistory();
  const { push } = useNavigation();

  // Load persistence search mode and custom projects
  useEffect(() => {
    (async () => {
      const storedMode = await LocalStorage.getItem<string>("search-mode");
      if (
        storedMode === "quick" ||
        storedMode === "full" ||
        storedMode === "custom"
      ) {
        setSearchMode(storedMode as SearchMode);
      }
      const storedCustomProjects =
        await LocalStorage.getItem<string>("custom-projects");
      if (storedCustomProjects) {
        setCustomProjects(storedCustomProjects);
      }
    })();
  }, []);

  // Check Gcloud Status on mount
  useEffect(() => {
    (async () => {
      const status = await checkGcloudStatus();
      setGcloudStatus(status);
    })();
  }, []);

  // Handle Search Mode Change
  const handleModeChange = async (newValue: string) => {
    const mode = newValue as SearchMode;
    setSearchMode(mode);
    await LocalStorage.setItem("search-mode", mode);
  };

  // Filter history
  const filteredHistory = useMemo(() => {
    return history.filter((h) => h.ip.includes(searchText));
  }, [history, searchText]);

  const startSearch = async (ip: string) => {
    if (!ip) return;

    // Check gcloud status before searching
    if (gcloudStatus.type === "error") {
      return;
    }

    // Validate IP format
    if (!isValidIP(ip.trim())) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid IP Address",
        message: "Please enter a valid IPv4 or IPv6 address",
      });
      return;
    }

    // Handle Custom Mode Config check
    if (searchMode === "custom" && !customProjects.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Custom Projects Configured",
        message: "Please add project IDs to search",
      });
      push(
        <CustomProjectsForm
          initialValue={customProjects}
          onSave={async (value) => {
            setCustomProjects(value);
            await LocalStorage.setItem("custom-projects", value);
          }}
        />,
      );
      return;
    }

    const customProjectList =
      searchMode === "custom"
        ? customProjects
            .split(",")
            .map((p) => p.trim())
            .filter((p) => p)
        : undefined;

    push(
      <ResultsView
        ip={ip}
        mode={searchMode}
        customProjectIds={customProjectList}
        onSaveToHistory={addToHistory}
        onSearchAgain={startSearch}
        onRemoveFromHistory={removeFromHistory}
      />,
    );
  };

  // Helper function to get error details for main view
  const getErrorDetails = () => {
    if (gcloudStatus.type !== "error") return null;

    switch (gcloudStatus.errorType) {
      case "missing_cli":
        return {
          title: "Gcloud CLI Not Found",
          description:
            "The Google Cloud SDK is required to use this extension.",
          command: "brew install google-cloud-sdk",
          commandLabel: "Install Command",
        };
      case "login_failed":
        return {
          title: "Authentication Required",
          description: "You are not logged in to Google Cloud.",
          command: "gcloud auth login",
          commandLabel: "Login Command",
        };
      default:
        return {
          title: "Connection Error",
          description:
            "An unexpected error occurred while connecting to Google Cloud.",
          command: "gcloud auth list",
          commandLabel: "Check Auth Command",
        };
    }
  };

  const errorDetails = getErrorDetails();

  // If there's an error, show error view instead of search interface
  if (gcloudStatus.type === "error" && errorDetails) {
    return (
      <List
        searchBarPlaceholder="Search IP or Select History..."
        navigationTitle="Search GCP IP Address | Status：🚫"
      >
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title={errorDetails.title}
          description={`${errorDetails.description}\n\nHow to Fix: ${errorDetails.command}`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy to Clipboard"
                content={errorDetails.command}
              />
              <Action.OpenInBrowser
                title="Open in GCP Console"
                url="https://console.cloud.google.com"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Check if we should show welcome view
  const isInitialLoading = isHistoryLoading;
  const showWelcome = !searchText && history.length === 0 && !isInitialLoading;

  return (
    <List
      isLoading={isInitialLoading}
      searchBarPlaceholder="Search IP or Select History..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      navigationTitle={
        gcloudStatus.type === "success"
          ? `Search GCP IP Address | ${gcloudStatus.account} | Status：✅`
          : gcloudStatus.type === "error"
            ? `Search GCP IP Address | Status：🚫 (${gcloudStatus.message})`
            : `Search GCP IP Address | Status：Checking...`
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search Mode"
          value={searchMode}
          onChange={handleModeChange}
        >
          <List.Dropdown.Item
            title="Quick (First Match)"
            value="quick"
            icon={Icon.Bolt}
          />
          <List.Dropdown.Item
            title="Detailed (Full Scan)"
            value="full"
            icon={Icon.MagnifyingGlass}
          />
          <List.Dropdown.Item
            title="Custom (Selected Projects)"
            value="custom"
            icon={Icon.List}
          />
        </List.Dropdown>
      }
    >
      {/* Show "Search New IP" if there is text input */}
      {searchText && (
        <List.Section title="New Search">
          <List.Item
            title={`Start Search "${searchText}"`}
            icon={Icon.MagnifyingGlass}
            actions={
              <ActionPanel>
                <Action
                  title="Start Search"
                  onAction={() => startSearch(searchText)}
                />
                <SwitchModeAction
                  currentMode={searchMode}
                  onModeChange={handleModeChange}
                />
                {searchMode === "custom" && (
                  <ConfigureProjectsAction
                    customProjects={customProjects}
                    onProjectsChange={setCustomProjects}
                  />
                )}
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {!showWelcome && (
        <List.Section title="Recent Searches">
          {filteredHistory.map((item) => {
            const projectInfos = Array.from(
              new Set(
                item.results.map(
                  (r) => `${r.projectName || r.projectId} (${r.projectId})`,
                ),
              ),
            ).join(", ");

            return (
              <List.Item
                key={item.ip}
                title={item.ip}
                subtitle={`${item.results.length} ${
                  item.results.length === 1 ? "resource" : "resources"
                } found in ${projectInfos}`}
                accessories={[
                  item.mode === "custom"
                    ? { icon: Icon.List, tooltip: "Custom Scan" }
                    : item.mode === "full"
                      ? { icon: Icon.MagnifyingGlass, tooltip: "Full Scan" }
                      : { icon: Icon.Bolt, tooltip: "Quick Scan" },
                  { date: new Date(item.timestamp), tooltip: "Last searched" },
                ]}
                icon={Icon.Clock}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Results"
                      icon={Icon.Eye}
                      onAction={() => {
                        // Check status before viewing
                        if (gcloudStatus.type === "error") {
                          return;
                        }
                        // Push with existing results to avoid re-searching
                        push(
                          <ResultsView
                            ip={item.ip}
                            initialResults={item.results}
                            onSaveToHistory={addToHistory}
                            onSearchAgain={startSearch}
                            onRemoveFromHistory={removeFromHistory}
                            mode={item.mode || "quick"}
                          />,
                        );
                      }}
                    />
                    <Action
                      title="Search Again"
                      icon={Icon.ArrowClockwise}
                      onAction={() => startSearch(item.ip)}
                    />
                    <Action
                      title="Remove from History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => removeFromHistory(item.ip)}
                      shortcut={{ modifiers: ["cmd"], key: "x" }}
                    />
                    <SwitchModeAction
                      currentMode={searchMode}
                      onModeChange={handleModeChange}
                    />
                    {searchMode === "custom" && (
                      <ConfigureProjectsAction
                        customProjects={customProjects}
                        onProjectsChange={setCustomProjects}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {showWelcome && (
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          title="Welcome to GCP IP Search"
          description={`Search for IP addresses across all your Google Cloud projects.\n\n💡 Tip: You can switch between Quick, Detailed, and Custom search mode.`}
          actions={
            <ActionPanel>
              {searchMode === "custom" ? (
                <>
                  <ConfigureProjectsAction
                    customProjects={customProjects}
                    onProjectsChange={setCustomProjects}
                  />
                  <SwitchModeAction
                    currentMode={searchMode}
                    onModeChange={handleModeChange}
                  />
                </>
              ) : (
                <>
                  <SwitchModeAction
                    currentMode={searchMode}
                    onModeChange={handleModeChange}
                  />
                </>
              )}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

export default function Command() {
  return <SearchCommand />;
}
