import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { copyDebugInfo } from "./utils/debug-info";
import { getErrorMessage, runWingetCommand } from "./utils/winget-command";
import { parseUpgradeOutput, WingetPackage, DebugInfo } from "./utils/winget-parser";

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
      console.log("[upgrade] Starting loadPackages");
      const output = await runWingetCommand(["upgrade"], { retries: 1 });
      if (!isCurrentRequest()) {
        return;
      }

      console.log("[upgrade] Got output, parsing...");
      const result = parseUpgradeOutput(output);
      console.log("[upgrade] Parse result:", {
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
        if (result.packages.length === 0) {
          await showToast({
            style: Toast.Style.Success,
            title: "All packages are up to date",
          });
        }
      }
    } catch (error: unknown) {
      if (!isCurrentRequest()) {
        return;
      }

      console.log("[upgrade] Exception:", error);
      const message = getErrorMessage(error);
      setLastError(message);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to get updates",
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

  async function handleUpdate(pkg: WingetPackage) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating...",
      message: pkg.name,
    });

    try {
      await runWingetCommand(["upgrade", "--id", pkg.id, "--silent"]);
      toast.style = Toast.Style.Success;
      toast.title = "Package Updated";
      toast.message = `${pkg.name} updated successfully`;

      await loadPackages();
    } catch (error: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update Failed";
      toast.message = getErrorMessage(error);
    }
  }

  async function handleUpdateAll() {
    if (packages.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No updates available",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating all packages...",
      message: `${packages.length} package(s)`,
    });

    try {
      await runWingetCommand(["upgrade", "--all", "--silent"]);
      toast.style = Toast.Style.Success;
      toast.title = "All Packages Updated";
      toast.message = "Successfully updated all packages";

      await loadPackages();
    } catch (error: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update Failed";
      toast.message = getErrorMessage(error);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter packages...">
      <List.Section title="Actions">
        <List.Item
          title="Update All Packages"
          icon={Icon.ArrowClockwise}
          accessories={[{ text: `${packages.length} update(s) available` }]}
          actions={
            <ActionPanel>
              <Action title="Update All" onAction={handleUpdateAll} icon={Icon.ArrowClockwise} />
              <Action title="Refresh" onAction={loadPackages} icon={Icon.RotateClockwise} />
              <Action
                title="Copy Debug Info"
                onAction={() => copyDebugInfo(lastDebug, lastError)}
                icon={Icon.Bug}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      {packages.length > 0 && (
        <List.Section title={`Available Updates (${packages.length})`}>
          {packages.map((pkg) => (
            <List.Item
              key={pkg.id}
              title={pkg.name}
              subtitle={pkg.id}
              accessories={[
                { text: pkg.version, tooltip: "Current version" },
                { text: "->" },
                { text: pkg.availableVersion || "?", tooltip: "Available version" },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Update Package" onAction={() => handleUpdate(pkg)} icon={Icon.Download} />
                  <Action title="Update All" onAction={handleUpdateAll} icon={Icon.ArrowClockwise} />
                  <Action title="Refresh" onAction={loadPackages} icon={Icon.RotateClockwise} />
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
          icon={Icon.CheckCircle}
          title="All packages are up to date"
          description="No updates available"
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={loadPackages} icon={Icon.RotateClockwise} />
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
