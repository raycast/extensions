import React from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  findXcodesPath,
  listAvailable,
  XcodeVersion,
  downloadXcode,
  installXcode,
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
      const available = listAvailable(cmdPath);
      setVersions(available);
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

  const handleDownload = async (version: string) => {
    if (!xcodesPath) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: t("download.downloading", { version }),
    });

    try {
      await downloadXcode(xcodesPath, version);

      toast.style = Toast.Style.Success;
      toast.title = t("download.success", { version });

      setTimeout(() => loadVersions(xcodesPath), 1000);
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = t("error");
      toast.message = error.message;
    }
  };

  const handleInstall = async (version: string) => {
    if (!xcodesPath) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: t("install.installing", { version }),
    });

    try {
      await installXcode(xcodesPath, version);

      toast.style = Toast.Style.Success;
      toast.title = t("install.success", { version });

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
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title={t("xcodes.viewDocs")}
                url="https://github.com/XcodesOrg/xcodes"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Xcode versions...">
      {versions.map((xcode, index) => (
        <List.Item
          key={index}
          icon={{
            source: xcode.isInstalled ? Icon.CheckCircle : Icon.Circle,
            tintColor: xcode.isInstalled ? Color.Green : Color.SecondaryText,
          }}
          title={`Xcode ${xcode.version}`}
          subtitle={xcode.build}
          accessories={[{ text: xcode.isInstalled ? t("list.installed") : "" }]}
          actions={
            <ActionPanel>
              {!xcode.isInstalled && (
                <>
                  <Action
                    title={t("list.installXcode", { version: xcode.version })}
                    icon={Icon.Download}
                    onAction={() => handleInstall(xcode.version)}
                  />
                  <Action
                    title={t("list.downloadXcode", { version: xcode.version })}
                    icon={Icon.ArrowDown}
                    onAction={() => handleDownload(xcode.version)}
                  />
                </>
              )}
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
