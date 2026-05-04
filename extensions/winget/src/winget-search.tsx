import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useCallback, useRef } from "react";
import { copyDebugInfo } from "./utils/debug-info";
import { getErrorMessage, runWingetCommand } from "./utils/winget-command";
import { parseSearchOutput, WingetPackage, DebugInfo } from "./utils/winget-parser";

export default function Command() {
  const [packages, setPackages] = useState<WingetPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [lastDebug, setLastDebug] = useState<DebugInfo | undefined>();
  const [lastError, setLastError] = useState<string | undefined>();
  const searchRequestId = useRef(0);

  const handleSearch = useCallback(async (query: string) => {
    const requestId = ++searchRequestId.current;
    const isCurrentRequest = () => requestId === searchRequestId.current;
    const trimmedQuery = query.trim();

    setSearchText(query);

    if (trimmedQuery.length === 0) {
      setPackages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log(`[search] Searching for: ${trimmedQuery}`);
      const output = await runWingetCommand(["search", trimmedQuery, "--count", "70"]);
      if (!isCurrentRequest()) {
        return;
      }

      console.log("[search] Got output, parsing...");
      const result = parseSearchOutput(output);
      console.log("[search] Parse result:", {
        packagesCount: result.packages.length,
        error: result.error,
        headerLineIndex: result.debug?.headerLineIndex,
        positions: result.debug?.positions,
      });

      setLastDebug(result.debug);
      setLastError(result.error);

      if (result.error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to parse search results",
          message: `${result.error}. Press Cmd+Shift+D to copy debug info.`,
        });
        setPackages([]);
      } else {
        setPackages(result.packages);
        if (result.packages.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No packages found",
            message: `No results for "${trimmedQuery}"`,
          });
        }
      }
    } catch (error: unknown) {
      if (!isCurrentRequest()) {
        return;
      }

      console.log("[search] Exception:", error);
      const message = getErrorMessage(error);
      setLastError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message,
      });
      setPackages([]);
    } finally {
      if (isCurrentRequest()) {
        setIsLoading(false);
      }
    }
  }, []);

  async function handleInstall(pkg: WingetPackage) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing...",
      message: pkg.name,
    });

    try {
      await runWingetCommand(["install", "--id", pkg.id, "--silent"]);
      toast.style = Toast.Style.Success;
      toast.title = "Package Installed";
      toast.message = `${pkg.name} installed successfully`;
    } catch (error: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Installation Failed";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search winget packages..."
      filtering={false}
      onSearchTextChange={handleSearch}
      throttle={true}
    >
      {packages.length > 0 && (
        <List.Section title={`Search Results (${packages.length})`}>
          {packages.map((pkg) => (
            <List.Item
              key={pkg.id}
              title={pkg.name}
              subtitle={pkg.id}
              icon={Icon.Box}
              accessories={[{ text: pkg.version }]}
              actions={
                <ActionPanel>
                  <Action title="Install Package" onAction={() => handleInstall(pkg)} icon={Icon.Download} />
                  <Action
                    title="Copy Debug Info"
                    onAction={() => copyDebugInfo(lastDebug, lastError)}
                    icon={Icon.Bug}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {!isLoading && searchText.length > 0 && packages.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No packages found"
          description="Try a different search term"
          actions={
            <ActionPanel>
              <Action
                title="Copy Debug Info"
                onAction={() => copyDebugInfo(lastDebug, lastError)}
                icon={Icon.Bug}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      )}
      {!isLoading && searchText.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search for packages"
          description="Start typing to search winget packages"
        />
      )}
    </List>
  );
}
