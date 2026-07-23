import {
  ActionPanel,
  Action,
  List,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  Color,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import {
  getInstalledTools,
  getRemoteVersions,
  installVersion,
  useGlobal,
  deactivateGlobally,
  uninstallVersion,
  extractErrorMessage,
} from "./mise";
import type { MiseInstalledTools, MiseRemoteVersion } from "./types";
import { homedir } from "os";
import { join } from "path";

interface InstalledVersionInfo {
  version: string;
  active: boolean;
  source?: { type: string; path: string };
}

export interface ToolVersionsProps {
  plugin: string;
  mode: "manage" | "install";
}

function isGloballyActive(source?: { type: string; path: string }): boolean {
  if (!source) return false;
  const miseConfigDir = join(homedir(), ".config", "mise");
  return source.path.startsWith(miseConfigDir);
}

function getInstalledVersions(
  data: MiseInstalledTools,
  plugin: string,
): InstalledVersionInfo[] {
  const versions = data[plugin] ?? [];
  return versions
    .map((v) => ({
      version: v.version,
      active: v.active,
      source: v.source,
    }))
    .sort((a, b) => {
      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;
      return b.version.localeCompare(a.version, undefined, { numeric: true });
    });
}

function getAvailableVersions(
  remote: MiseRemoteVersion[],
  installedVersions: InstalledVersionInfo[],
): MiseRemoteVersion[] {
  const installedSet = new Set(installedVersions.map((v) => v.version));
  return remote
    .filter((v) => !installedSet.has(v.version))
    .sort((a, b) =>
      b.version.localeCompare(a.version, undefined, { numeric: true }),
    );
}

function getSourceLabel(
  active: boolean,
  source?: { type: string; path: string },
): string {
  if (active && source) {
    return isGloballyActive(source) ? "Global" : "Local";
  }
  if (active) return "Active";
  return "";
}

function getSourceColor(
  active: boolean,
  source?: { type: string; path: string },
): Color {
  if (active && source) {
    return isGloballyActive(source) ? Color.Blue : Color.Orange;
  }
  if (active) return Color.Green;
  return Color.SecondaryText;
}

export default function ToolVersions({ plugin, mode }: ToolVersionsProps) {
  const fetchInstalled = useCallback(async () => {
    return await getInstalledTools();
  }, []);

  const fetchRemote = useCallback(async () => {
    return await getRemoteVersions(plugin);
  }, [plugin]);

  const {
    isLoading: installedLoading,
    data: installedData,
    revalidate: revalidateInstalled,
  } = usePromise(fetchInstalled);

  const {
    isLoading: remoteLoading,
    data: remoteData,
    error: remoteError,
    revalidate: revalidateRemote,
  } = usePromise(fetchRemote);

  const installed = useMemo(
    () => getInstalledVersions(installedData ?? {}, plugin),
    [installedData, plugin],
  );

  const available = useMemo(
    () => getAvailableVersions(remoteData ?? [], installed),
    [remoteData, installed],
  );

  const isLoading = installedLoading || remoteLoading;

  if (remoteError) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Fetch Versions"
          description={`Failed to list versions for "${plugin}". Error: ${remoteError.message}`}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={revalidateRemote}
                icon={Icon.ArrowClockwise}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search ${plugin} versions...`}
      navigationTitle={`${plugin} Versions`}
    >
      {installed.length > 0 && (
        <List.Section title="Installed">
          {installed.map((v) => {
            const sourceLabel = getSourceLabel(v.active, v.source);
            return (
              <List.Item
                key={`installed-${v.version}`}
                title={v.version}
                icon={
                  v.active
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : Icon.Circle
                }
                accessories={
                  sourceLabel
                    ? [
                        {
                          tag: {
                            value: sourceLabel,
                            color: getSourceColor(v.active, v.source),
                          },
                        },
                      ]
                    : []
                }
                actions={
                  <ActionPanel>
                    {!v.active && (
                      <Action
                        title="Use Globally"
                        icon={Icon.Globe}
                        onAction={async () => {
                          const toast = await showToast({
                            style: Toast.Style.Animated,
                            title: "Setting globally...",
                          });
                          try {
                            await useGlobal(plugin, v.version);
                            toast.style = Toast.Style.Success;
                            toast.title = "Set globally";
                            revalidateInstalled();
                          } catch (e) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed";
                            toast.message = extractErrorMessage(e);
                          }
                        }}
                      />
                    )}
                    {v.active && isGloballyActive(v.source) && (
                      <Action
                        title="Deactivate Globally"
                        icon={Icon.XMarkCircle}
                        style={Action.Style.Destructive}
                        onAction={async () => {
                          const ok = await confirmAlert({
                            title: `Deactivate ${plugin} globally?`,
                            message:
                              "This will remove the global pin. The tool may still be active via local config.",
                          });
                          if (!ok) return;
                          const toast = await showToast({
                            style: Toast.Style.Animated,
                            title: "Deactivating...",
                          });
                          try {
                            await deactivateGlobally(plugin);
                            toast.style = Toast.Style.Success;
                            toast.title = "Deactivated globally";
                            revalidateInstalled();
                          } catch (e) {
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed";
                            toast.message = extractErrorMessage(e);
                          }
                        }}
                      />
                    )}
                    <Action
                      title="Uninstall"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        const msg = v.active
                          ? "This is your active version. Uninstalling will remove it."
                          : "This will remove the installed version from your system.";
                        const ok = await confirmAlert({
                          title: `Uninstall ${plugin}@${v.version}?`,
                          message: msg,
                        });
                        if (!ok) return;
                        const toast = await showToast({
                          style: Toast.Style.Animated,
                          title: "Uninstalling...",
                        });
                        try {
                          await uninstallVersion(plugin, v.version);
                          toast.style = Toast.Style.Success;
                          toast.title = "Uninstalled";
                          revalidateInstalled();
                          if (mode === "install") revalidateRemote();
                        } catch (e) {
                          toast.style = Toast.Style.Failure;
                          toast.title = "Failed";
                          toast.message = extractErrorMessage(e);
                        }
                      }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Version"
                      content={v.version}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {mode === "install" && (
        <List.Section title="Available">
          {available.length === 0 && !isLoading ? (
            <List.EmptyView
              icon={Icon.CheckCircle}
              title="All Versions Installed"
              description={`You have all available versions of ${plugin} installed.`}
            />
          ) : (
            available.map((v) => (
              <List.Item
                key={`available-${v.version}`}
                title={v.version}
                icon={Icon.Download}
                actions={
                  <ActionPanel>
                    <Action
                      title="Install"
                      icon={Icon.Download}
                      onAction={async () => {
                        const toast = await showToast({
                          style: Toast.Style.Animated,
                          title: `Installing ${plugin}@${v.version}...`,
                        });
                        try {
                          await installVersion(plugin, v.version);
                          toast.style = Toast.Style.Success;
                          toast.title = "Installed";
                          toast.message = `${plugin}@${v.version} installed successfully.`;
                          revalidateInstalled();
                          revalidateRemote();
                        } catch (e) {
                          toast.style = Toast.Style.Failure;
                          toast.title = "Install Failed";
                          toast.message = extractErrorMessage(e);
                        }
                      }}
                    />
                    <Action
                      title="Install and Use Globally"
                      icon={Icon.Globe}
                      onAction={async () => {
                        const toast = await showToast({
                          style: Toast.Style.Animated,
                          title: `Installing ${plugin}@${v.version}...`,
                        });
                        try {
                          await installVersion(plugin, v.version);
                          await useGlobal(plugin, v.version);
                          toast.style = Toast.Style.Success;
                          toast.title = "Installed & Set Globally";
                          revalidateInstalled();
                          revalidateRemote();
                        } catch (e) {
                          toast.style = Toast.Style.Failure;
                          toast.title = "Failed";
                          toast.message = extractErrorMessage(e);
                        }
                      }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Version"
                      content={v.version}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            ))
          )}
        </List.Section>
      )}
    </List>
  );
}
