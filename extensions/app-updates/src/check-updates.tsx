import { Action, ActionPanel, Color, Icon, LaunchType, List, launchCommand, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { useEffect, useState } from "react";
import { scanSparkleUpdates } from "./utils/sparkle-scanner";
import { scanCaskUpdates } from "./utils/cask-scanner";
import { scanMasUpdates } from "./utils/mas-scanner";
import { getBrewPath } from "./utils/brew-path";
import { storeUpdates } from "./utils/update-store";
import { getToolStatus } from "./utils/tool-status";
import type { AppUpdate, ToolStatus, UpdateSource } from "./utils/types";

const execFileAsync = promisify(execFile);

const SOURCE_LABELS: Record<UpdateSource, { label: string; color: Color }> = {
  sparkle: { label: "Sparkle", color: Color.Purple },
  cask: { label: "Homebrew", color: Color.Orange },
  mas: { label: "App Store", color: Color.Blue },
};

async function refreshMenuBar() {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // Re-launch fails if the menu bar command is not enabled — safe to ignore.
  }
}

export default function Command() {
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState("Starting scan...");
  const [tools, setTools] = useState<ToolStatus>({ brew: true, mas: true });

  useEffect(() => {
    (async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Scanning for updates...",
      });

      try {
        setTools(getToolStatus());
        const allUpdates: AppUpdate[] = [];

        setStatus("Checking Homebrew Cask & Mac App Store...");
        const [caskUpdates, masUpdates] = await Promise.all([scanCaskUpdates(), scanMasUpdates()]);
        allUpdates.push(...caskUpdates, ...masUpdates);

        setStatus("Checking Sparkle feeds...");
        const sparkleUpdates = await scanSparkleUpdates((current, total) => {
          setStatus(`Checking Sparkle feeds... (${current}/${total})`);
        });
        allUpdates.push(...sparkleUpdates);

        allUpdates.sort((a, b) => a.name.localeCompare(b.name));
        setUpdates(allUpdates);
        await storeUpdates(allUpdates);
        await refreshMenuBar();

        if (allUpdates.length === 0) {
          toast.style = Toast.Style.Success;
          toast.title = "All apps are up to date";
        } else {
          toast.style = Toast.Style.Success;
          toast.title = `${allUpdates.length} update(s) available`;
        }
      } catch (error) {
        console.error("Scan failed:", error);
        toast.style = Toast.Style.Failure;
        toast.title = "Scan failed";
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function updateList(newUpdates: AppUpdate[]) {
    setUpdates(newUpdates);
    await storeUpdates(newUpdates);
    await refreshMenuBar();
  }

  const grouped: Record<UpdateSource, AppUpdate[]> = {
    cask: updates.filter((u) => u.source === "cask"),
    sparkle: updates.filter((u) => u.source === "sparkle"),
    mas: updates.filter((u) => u.source === "mas"),
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter apps...">
      {isLoading ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Scanning..." description={status} />
      ) : updates.length === 0 ? (
        <List.EmptyView icon={Icon.CheckCircle} title="All Up to Date" description="No updates found." />
      ) : (
        <>
          {(Object.entries(grouped) as [UpdateSource, AppUpdate[]][])
            .filter(([, items]) => items.length > 0)
            .map(([source, items]) => (
              <List.Section key={source} title={SOURCE_LABELS[source].label} subtitle={`${items.length} update(s)`}>
                {items.map((app) => (
                  <List.Item
                    key={`${source}-${app.name}`}
                    icon={app.appPath ? { fileIcon: app.appPath } : Icon.AppWindow}
                    title={app.name}
                    subtitle={`${app.currentVersion} → ${app.latestVersion}`}
                    accessories={[
                      {
                        tag: {
                          value: SOURCE_LABELS[source].label,
                          color: SOURCE_LABELS[source].color,
                        },
                      },
                    ]}
                    actions={
                      <ActionPanel>
                        {app.source === "cask" && (
                          <Action
                            title="Brew Upgrade"
                            icon={Icon.Download}
                            onAction={async () => {
                              const toast = await showToast({
                                style: Toast.Style.Animated,
                                title: `Upgrading ${app.name}...`,
                              });
                              try {
                                const brewPath = await getBrewPath();
                                if (!brewPath) throw new Error("Homebrew not found");
                                await execFileAsync(brewPath, ["upgrade", "--cask", app.name], { timeout: 120000 });
                                toast.style = Toast.Style.Success;
                                toast.title = `${app.name} upgraded to ${app.latestVersion}`;
                                await updateList(updates.filter((u) => u !== app));
                              } catch (err) {
                                toast.style = Toast.Style.Failure;
                                toast.title = `Failed to upgrade ${app.name}`;
                                toast.message = err instanceof Error ? err.message.split("\n")[0] : undefined;
                              }
                            }}
                          />
                        )}
                        {app.appPath && <Action.Open title="Open App" target={app.appPath} />}
                        {app.downloadUrl && <Action.OpenInBrowser title="Download Update" url={app.downloadUrl} />}
                        {app.source === "cask" && (
                          <Action.CopyToClipboard
                            title="Copy Brew Upgrade Command"
                            content={`brew upgrade --cask ${app.name}`}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                          />
                        )}
                        <Action.CopyToClipboard
                          title="Copy App Name"
                          content={app.name}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            ))}
          {(!tools.brew || !tools.mas) && (
            <List.Section title="Missing Tools">
              {!tools.brew && (
                <List.Item
                  key="install-brew"
                  icon={Icon.Download}
                  title="Install Homebrew"
                  subtitle="Required for Cask update detection"
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open Brew.sh" url="https://brew.sh" />
                    </ActionPanel>
                  }
                />
              )}
              {!tools.mas && (
                <List.Item
                  key="install-mas"
                  icon={Icon.Download}
                  title="Install mas (Mac App Store CLI)"
                  subtitle={tools.brew ? "brew install mas" : "Requires Homebrew"}
                  actions={
                    <ActionPanel>
                      {tools.brew && <Action.CopyToClipboard title="Copy Install Command" content="brew install mas" />}
                      <Action.OpenInBrowser title="Open GitHub" url="https://github.com/mas-cli/mas" />
                    </ActionPanel>
                  }
                />
              )}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
