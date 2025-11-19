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

export default function Command() {
  const [versions, setVersions] = useState<XcodeVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [xcodesPath, setXcodesPath] = useState<string | null>(null);

  useEffect(() => {
    const path = findXcodesPath();
    setXcodesPath(path);

    if (!path) {
      setError("xcodes not found");
      setIsLoading(false);
      showToast({
        style: Toast.Style.Failure,
        title: "xcodes not found",
        message: "Install with: brew install xcodesorg/made/xcodes",
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
        title: "Error",
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
      title: `Downloading Xcode ${version}...`,
    });

    try {
      await downloadXcode(xcodesPath, version);

      toast.style = Toast.Style.Success;
      toast.title = `Xcode ${version} downloaded successfully`;

      setTimeout(() => loadVersions(xcodesPath), 1000);
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = error.message;
    }
  };

  const handleInstall = async (version: string) => {
    if (!xcodesPath) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Installing Xcode ${version}...`,
    });

    try {
      await installXcode(xcodesPath, version);

      toast.style = Toast.Style.Success;
      toast.title = `Xcode ${version} installed successfully`;

      setTimeout(() => loadVersions(xcodesPath), 1000);
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Error";
      toast.message = error.message;
    }
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Error"
          description={error}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="View xcodes Documentation"
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
          accessories={[{ text: xcode.isInstalled ? "Installed" : "" }]}
          actions={
            <ActionPanel>
              {!xcode.isInstalled && (
                <>
                  <Action
                    title={`Install Xcode ${xcode.version}`}
                    icon={Icon.Download}
                    onAction={() => handleInstall(xcode.version)}
                  />
                  <Action
                    title={`Download Xcode ${xcode.version}`}
                    icon={Icon.ArrowDown}
                    onAction={() => handleDownload(xcode.version)}
                  />
                </>
              )}
              <Action
                title="Reload"
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
