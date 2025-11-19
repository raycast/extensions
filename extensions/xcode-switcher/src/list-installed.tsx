import React from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { findXcodesPath, listInstalled, XcodeVersion } from "./utils/xcodes";
import { t } from "./utils/i18n";
import { exec } from "child_process";

export default function Command() {
  const [versions, setVersions] = useState<XcodeVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadVersions();
  }, []);

  const loadVersions = async () => {
    setIsLoading(true);
    const xcodesPath = findXcodesPath();

    if (!xcodesPath) {
      setError(t("xcodes.notFound"));
      showToast({
        style: Toast.Style.Failure,
        title: t("xcodes.notFound"),
        message: t("xcodes.installMessage"),
      });
      setIsLoading(false);
      return;
    }

    try {
      const installed = listInstalled(xcodesPath);
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

  const openInFinder = (path: string) => {
    exec(`open "${path}"`);
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
          icon={Icon.Box}
          title={`Xcode ${xcode.version}`}
          subtitle={xcode.build}
          accessories={[{ text: xcode.path }]}
          actions={
            <ActionPanel>
              {xcode.path && (
                <Action
                  title={t("installed.openInFinder")}
                  icon={Icon.Finder}
                  onAction={() => openInFinder(xcode.path!)}
                />
              )}
              <Action
                title={t("reload")}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={loadVersions}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
