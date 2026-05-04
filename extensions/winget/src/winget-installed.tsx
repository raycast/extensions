import { List, ActionPanel, Action, Icon, showToast, Toast, confirmAlert, Alert } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { copyDebugInfo } from "./utils/debug-info";
import { getErrorMessage, runWingetCommand } from "./utils/winget-command";
import { parseListOutput, WingetPackage, DebugInfo } from "./utils/winget-parser";

export default function Command() {
  const [packages, setPackages] = useState<WingetPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDebug, setLastDebug] = useState<DebugInfo | undefined>();
  const [lastError, setLastError] = useState<string | undefined>();
  const loadRequestId = useRef(0);

  async function loadPackages() {
    const requestId = ++loadRequestId.current;
    const isCurrentRequest = () => requestId === loadRequestId.current;

    setIsLoading(true);
    try {
      console.log("[list] Starting loadPackages");
      const output = await runWingetCommand(["list"]);
      if (!isCurrentRequest()) {
        return;
      }

      console.log("[list] Got output, parsing...");
      const result = parseListOutput(output);
      console.log("[list] Parse result:", {
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
          title: "Failed to parse winget output",
          message: `${result.error}. Press Cmd+Shift+D to copy debug info.`,
        });
        setPackages([]);
      } else {
        setPackages(result.packages);
      }
    } catch (error: unknown) {
      if (!isCurrentRequest()) {
        return;
      }

      console.log("[list] Exception:", error);
      const message = getErrorMessage(error);
      setLastError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to get installed packages",
        message,
      });
      setPackages([]);
    } finally {
      if (isCurrentRequest()) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    loadPackages();
  }, []);

  async function handleUninstall(pkg: WingetPackage) {
    const confirmed = await confirmAlert({
      title: "Uninstall Package",
      message: `Are you sure you want to uninstall ${pkg.name}?`,
      primaryAction: {
        title: "Uninstall",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Uninstalling...",
      message: pkg.name,
    });

    try {
      await runWingetCommand(["uninstall", "--id", pkg.id, "--silent"]);
      toast.style = Toast.Style.Success;
      toast.title = "Package Uninstalled";
      toast.message = `${pkg.name} uninstalled successfully`;

      await loadPackages();
    } catch (error: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Uninstall Failed";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter installed packages...">
      {packages.length > 0 && (
        <List.Section title={`Installed Packages (${packages.length})`}>
          {packages.map((pkg) => (
            <List.Item
              key={pkg.id}
              title={pkg.name}
              subtitle={pkg.id}
              icon={Icon.Box}
              accessories={[
                { text: pkg.version, tooltip: "Installed version" },
                ...(pkg.source ? [{ text: pkg.source, tooltip: "Source" }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Uninstall Package"
                    onAction={() => handleUninstall(pkg)}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                  />
                  <Action title="Refresh List" onAction={loadPackages} icon={Icon.ArrowClockwise} />
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
      {!isLoading && packages.length === 0 && (
        <List.EmptyView
          icon={Icon.Box}
          title="No packages found"
          description="No packages installed via winget"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={loadPackages} icon={Icon.ArrowClockwise} />
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
    </List>
  );
}
