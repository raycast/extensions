import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Color,
  confirmAlert,
  Alert,
  open,
  closeMainWindow,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { loadVessloData } from "./utils/data";
// loadVessloData is used for post-update refresh in updateAllDirect()
import { exec } from "child_process";
import { promisify } from "util";
import { getBrewPath } from "./utils/brew";
import { useVessloData } from "./utils/useVessloData";
import { runBrewUpgrade, runBrewUpgradeInTerminal } from "./utils/actions";

const execAsync = promisify(exec);

export default function BulkHomebrewUpdate() {
  const { data, isLoading, setData } = useVessloData();
  const [isUpdating, setIsUpdating] = useState(false);

  const homebrewAppsWithUpdates = useMemo(() => {
    if (!data) return [];
    return data.apps.filter(
      (app) =>
        app.sources.includes("Brew") &&
        app.targetVersion !== null &&
        app.targetVersion !== undefined &&
        app.targetVersion !== "undefined" &&
        app.targetVersion.trim() !== "" &&
        app.homebrewCask,
    );
  }, [data]);

  // Update All via Vesslo deep link (recommended)
  async function updateAllViaVesslo() {
    if (homebrewAppsWithUpdates.length === 0) return;

    await closeMainWindow();
    await open("vesslo://update-all");
    await showToast({
      style: Toast.Style.Success,
      title: "Opening Vesslo",
      message: "Batch update started in Vesslo",
    });
  }

  // Quick Update All directly in Raycast (alternative)
  async function updateAllDirect() {
    if (homebrewAppsWithUpdates.length === 0) return;

    const confirmed = await confirmAlert({
      title: "Update All Homebrew Apps",
      message: `This will update ${homebrewAppsWithUpdates.length} apps using Homebrew. Continue?`,
      primaryAction: { title: "Update All", style: Alert.ActionStyle.Default },
      dismissAction: { title: "Cancel" },
    });

    if (!confirmed) return;

    setIsUpdating(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Updating all Homebrew apps...",
        message: `${homebrewAppsWithUpdates.length} apps`,
      });

      const brewPath = getBrewPath();
      const { stdout } = await execAsync(`${brewPath} upgrade --cask`);

      await showToast({
        style: Toast.Style.Success,
        title: "All apps updated!",
        message: stdout?.slice(0, 100) || "Update complete",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message.slice(0, 100) : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Update failed",
        message: errorMessage,
      });
    } finally {
      setIsUpdating(false);
      const refreshed = loadVessloData();
      if (refreshed) setData(refreshed);
    }
  }

  // Update single app via Vesslo deep link (default)
  async function updateSingleViaVesslo(bundleId: string, appName: string) {
    await closeMainWindow();
    await open(`vesslo://update/${bundleId}`);
    await showToast({
      style: Toast.Style.Success,
      title: `Opening Vesslo`,
      message: `Updating ${appName}...`,
    });
  }

  return (
    <List isLoading={isLoading || isUpdating}>
      {homebrewAppsWithUpdates.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="All Homebrew apps are up to date!"
          description="No Homebrew updates available"
        />
      ) : (
        <>
          <List.Section
            title={`Homebrew Updates (${homebrewAppsWithUpdates.length})`}
          >
            {/* Update All item */}
            <List.Item
              icon={{ source: Icon.ArrowDown, tintColor: Color.Green }}
              title="Update All Homebrew Apps"
              subtitle={`${homebrewAppsWithUpdates.length} apps`}
              accessories={[{ tag: { value: "BULK", color: Color.Green } }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Recommended">
                    <Action
                      title="Update All in Vesslo"
                      icon={Icon.Download}
                      onAction={updateAllViaVesslo}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Alternative">
                    <Action
                      title="Quick Update All (Direct)"
                      icon={Icon.ArrowDown}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                      onAction={updateAllDirect}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Individual Apps">
            {homebrewAppsWithUpdates.map((app) => (
              <List.Item
                key={app.id}
                icon={
                  app.icon
                    ? { source: `data:image/png;base64,${app.icon}` }
                    : Icon.AppWindow
                }
                title={app.name}
                subtitle={app.developer ?? ""}
                accessories={[
                  { text: `${app.version} → ${app.targetVersion}` },
                  { tag: { value: "brew", color: Color.Orange } },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Recommended">
                      {app.bundleId && (
                        <Action
                          title="Update in Vesslo"
                          icon={Icon.Download}
                          onAction={() =>
                            updateSingleViaVesslo(app.bundleId!, app.name)
                          }
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Alternative">
                      <Action
                        title="Quick Update (Direct)"
                        icon={Icon.ArrowDown}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                        onAction={() =>
                          runBrewUpgrade(app.homebrewCask!, app.name)
                        }
                      />
                      <Action
                        title="Update Via Terminal"
                        icon={Icon.Terminal}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                        onAction={() =>
                          runBrewUpgradeInTerminal(app.homebrewCask!)
                        }
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Bulk">
                      <Action
                        title="Update All in Vesslo"
                        icon={Icon.Download}
                        onAction={updateAllViaVesslo}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
