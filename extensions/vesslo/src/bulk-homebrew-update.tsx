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
} from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { loadVessloData } from "./utils/data";
import { VessloData } from "./types";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default function BulkHomebrewUpdate() {
  const [data, setData] = useState<VessloData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const loaded = loadVessloData();
    setData(loaded);
    setIsLoading(false);
  }, []);

  const homebrewAppsWithUpdates = useMemo(() => {
    if (!data) return [];
    return data.apps.filter(
      (app) =>
        app.sources.includes("Brew") &&
        app.targetVersion !== null &&
        app.homebrewCask,
    );
  }, [data]);

  async function updateAll() {
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

      const { stdout } = await execAsync(
        "/opt/homebrew/bin/brew upgrade --cask",
      );

      await showToast({
        style: Toast.Style.Success,
        title: "All apps updated!",
        message: stdout || "Update complete",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Update failed",
        message: errorMessage,
      });
    } finally {
      setIsUpdating(false);
    }
  }

  async function updateSingle(caskName: string, appName: string) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Updating ${appName}...`,
      });

      const { stdout } = await execAsync(
        `/opt/homebrew/bin/brew upgrade --cask ${caskName}`,
      );

      await showToast({
        style: Toast.Style.Success,
        title: `${appName} updated!`,
        message: stdout || "Update complete",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to update ${appName}`,
        message: errorMessage,
      });
    }
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
                  <Action
                    title="Update All"
                    icon={Icon.ArrowDown}
                    onAction={updateAll}
                  />
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
                    <Action
                      title="Update"
                      icon={Icon.ArrowDown}
                      onAction={() => updateSingle(app.homebrewCask!, app.name)}
                    />
                    <Action
                      title="Update All"
                      icon={Icon.ArrowDown}
                      onAction={updateAll}
                    />
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
