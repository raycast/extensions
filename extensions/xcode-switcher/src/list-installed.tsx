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
      setError("xcodes not found");
      showToast({
        style: Toast.Style.Failure,
        title: "xcodes not found",
        message: "Install with: brew install xcodesorg/made/xcodes",
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
        title: "Error",
        message: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openInFinder = (path: string) => {
    open(path);
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Error"
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
                  title="Open in Finder"
                  icon={Icon.Finder}
                  onAction={() => openInFinder(xcode.path!)}
                />
              )}
              <Action
                title="Reload"
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
