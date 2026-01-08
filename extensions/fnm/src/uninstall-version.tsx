import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showToast,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import React, { useEffect, useState } from "react";
import { checkFnmInstalled, getInstalledVersions, NodeVersion, uninstallVersion, getFnmPath } from "./utils/fnm";

export default function UninstallVersion() {
  const [versions, setVersions] = useState<NodeVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fnmInstalled, setFnmInstalled] = useState(true);

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    setIsLoading(true);

    const installed = await checkFnmInstalled();
    setFnmInstalled(installed);

    if (!installed) {
      const fnmPath = getFnmPath();
      await showToast({
        style: Toast.Style.Failure,
        title: "fnm 未找到",
        message: fnmPath.includes("/") ? `路径 ${fnmPath} 不存在,请检查配置` : "请安装 fnm 或在设置中配置路径",
      });
      setIsLoading(false);
      return;
    }

    const installedVersions = await getInstalledVersions();
    setVersions(installedVersions);
    setIsLoading(false);
  }

  async function handleUninstall(version: string, isCurrent: boolean) {
    if (isCurrent) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot uninstall current version",
        message: "Please switch to another version first",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Uninstall Node.js Version",
      message: `Are you sure you want to uninstall Node.js ${version}?`,
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
      title: `Uninstalling Node.js ${version}...`,
    });

    const result = await uninstallVersion(version);

    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = `Node.js ${version} uninstalled successfully`;
      await loadVersions();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Uninstallation failed";
      toast.message = result.message;
    }
  }

  if (!fnmInstalled) {
    const fnmPath = getFnmPath();
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title="fnm 未找到"
          description={
            fnmPath.includes("/")
              ? `配置的路径 ${fnmPath} 不存在\n请检查扩展设置中的路径配置`
              : "请先安装 fnm 或在扩展设置中配置 fnm 路径\n\n安装方法: brew install fnm"
          }
          actions={
            <ActionPanel>
              <Action title="打开扩展设置" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search installed versions...">
      {versions.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Download}
          title="No Node.js versions installed"
          description="Use 'Install Node.js Version' command to install a version"
        />
      ) : (
        versions.map((version) => (
          <List.Item
            key={version.version}
            icon={{
              source: Icon.Trash,
              tintColor: version.isCurrent ? Color.Red : Color.SecondaryText,
            }}
            title={version.version}
            accessories={[
              ...(version.isCurrent ? [{ tag: { value: "current", color: Color.Green } }] : []),
              ...(version.isDefault ? [{ tag: { value: "default", color: Color.Blue } }] : []),
              ...(version.isLts ? [{ tag: { value: "lts", color: Color.Orange } }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Uninstall This Version"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleUninstall(version.version, version.isCurrent)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={loadVersions}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
