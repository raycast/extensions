import React from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  findXcodesPath,
  listInstalled,
  uninstallXcode,
  XcodeVersion,
} from "./utils/xcodes";
import { t } from "./utils/i18n";

export default function Command() {
  const [versions, setVersions] = useState<XcodeVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [xcodesPath, setXcodesPath] = useState<string | null>(null);

  useEffect(() => {
    const path = findXcodesPath();
    setXcodesPath(path);

    if (!path) {
      setError(t("xcodes.notFound"));
      setIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: t("xcodes.notFound"),
        message: t("xcodes.installMessage"),
      });
    } else {
      loadVersions(path);
    }
  }, []);

  const loadVersions = async (cmdPath: string) => {
    setIsLoading(true);
    try {
      const installed = listInstalled(cmdPath);
      setVersions(installed);
    } catch (err: any) {
      setError(err.message);
      showToast({
        style: Toast.Style.Failure,
        title: t("error"),
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUninstall = async (version: string) => {
    if (!xcodesPath) return;

    const confirmed = await confirmAlert({
      title: t("uninstall.confirm", { version }),
      message: t("uninstall.confirm", { version }),
      primaryAction: {
        title: t("uninstall.title"),
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: t("uninstall.uninstalling", { version }),
    });

    try {
      await uninstallXcode(xcodesPath, version);

      toast.style = Toast.Style.Success;
      toast.title = t("uninstall.success", { version });

      setTimeout(() => loadVersions(xcodesPath), 1000);
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = t("error");
      toast.message = error.message;
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title={t("error")}
          description={error}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {versions.map((xcode, index) => (
        <List.Item
          key={index}
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          title={`Xcode ${xcode.version}`}
          subtitle={xcode.build}
          accessories={[{ text: xcode.path }]}
          actions={
            <ActionPanel>
              <Action
                title={t("uninstall.title")}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleUninstall(xcode.version)}
              />
              <Action
                title={t("reload")}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => xcodesPath && loadVersions(xcodesPath)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
