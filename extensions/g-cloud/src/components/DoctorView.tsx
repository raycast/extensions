import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  Clipboard,
  openExtensionPreferences,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { runDiagnostics, DiagnosticResult, Platform } from "../utils/gcloudDetect";

interface DoctorViewProps {
  configuredPath?: string;
}

function getPlatformIcon(platform: Platform): { source: Icon; tintColor: Color } {
  switch (platform) {
    case "macos":
      return { source: Icon.Monitor, tintColor: Color.Blue };
    case "windows":
      return { source: Icon.Window, tintColor: Color.Blue };
    case "linux":
      return { source: Icon.Terminal, tintColor: Color.Orange };
  }
}

function getPlatformName(platform: Platform): string {
  switch (platform) {
    case "macos":
      return "macOS";
    case "windows":
      return "Windows";
    case "linux":
      return "Linux";
  }
}

export default function DoctorView({ configuredPath }: DoctorViewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);

  useEffect(() => {
    loadDiagnostics();
  }, [configuredPath]);

  async function loadDiagnostics() {
    setIsLoading(true);
    try {
      const result = await runDiagnostics(configuredPath);
      setDiagnostics(result);
    } catch (error) {
      console.error("Error running diagnostics:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Diagnostics failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function copyPath() {
    if (diagnostics?.gcloudPath) {
      await Clipboard.copy(diagnostics.gcloudPath);
      showToast({
        style: Toast.Style.Success,
        title: "Path copied",
        message: diagnostics.gcloudPath,
      });
    }
  }

  async function copyInstallCommand() {
    if (diagnostics?.installInstructions.command) {
      await Clipboard.copy(diagnostics.installInstructions.command);
      showToast({
        style: Toast.Style.Success,
        title: "Command copied",
        message: diagnostics.installInstructions.command,
      });
    }
  }

  if (!diagnostics) {
    return (
      <List isLoading={isLoading} navigationTitle="Doctor">
        <List.EmptyView title="Running diagnostics..." icon={Icon.Heartbeat} />
      </List>
    );
  }

  const statusItems: { title: string; value: string; icon: Icon; color: Color; isOk: boolean }[] = [
    {
      title: "Platform",
      value: getPlatformName(diagnostics.platform),
      icon: getPlatformIcon(diagnostics.platform).source,
      color: getPlatformIcon(diagnostics.platform).tintColor,
      isOk: true,
    },
    {
      title: "gcloud SDK",
      value: diagnostics.gcloudPath || "Not found",
      icon: diagnostics.isValid ? Icon.CheckCircle : Icon.XMarkCircle,
      color: diagnostics.isValid ? Color.Green : Color.Red,
      isOk: diagnostics.isValid,
    },
    {
      title: "Version",
      value: diagnostics.gcloudVersion || "Unknown",
      icon: diagnostics.gcloudVersion ? Icon.CheckCircle : Icon.XMarkCircle,
      color: diagnostics.gcloudVersion ? Color.Green : Color.Red,
      isOk: !!diagnostics.gcloudVersion,
    },
    {
      title: "Authenticated",
      value: diagnostics.authenticatedAccount || "Not authenticated",
      icon: diagnostics.authenticatedAccount ? Icon.CheckCircle : Icon.XMarkCircle,
      color: diagnostics.authenticatedAccount ? Color.Green : Color.Yellow,
      isOk: !!diagnostics.authenticatedAccount,
    },
    {
      title: "Default Project",
      value: diagnostics.defaultProject || "Not set (select in extension)",
      icon: diagnostics.defaultProject ? Icon.CheckCircle : Icon.Info,
      color: diagnostics.defaultProject ? Color.Green : Color.SecondaryText,
      isOk: true, // Not required - user can select project in extension
    },
  ];

  // All systems go if gcloud is valid and user is authenticated
  const allOk = diagnostics.isValid && diagnostics.authenticatedAccount;

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Doctor"
      searchBarPlaceholder="gcloud SDK Diagnostics"
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadDiagnostics} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {/* Status Section */}
      <List.Section title={allOk ? "All Systems Go" : "Diagnostics"}>
        {statusItems.map((item) => (
          <List.Item
            key={item.title}
            title={item.title}
            subtitle={item.value}
            icon={{ source: item.icon, tintColor: item.color }}
            accessories={[{ tag: { value: item.isOk ? "OK" : "Issue", color: item.isOk ? Color.Green : Color.Red } }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {item.title === "gcloud SDK" && diagnostics.gcloudPath && (
                    <Action title="Copy Path" icon={Icon.Clipboard} onAction={copyPath} />
                  )}
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={loadDiagnostics} />
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                </ActionPanel.Section>
                {item.title === "gcloud SDK" && !diagnostics.isValid && (
                  <ActionPanel.Section title="Install">
                    <Action.OpenInBrowser
                      title={diagnostics.installInstructions.title}
                      url={diagnostics.installInstructions.url}
                    />
                    {diagnostics.installInstructions.command && (
                      <Action title="Copy Install Command" icon={Icon.Terminal} onAction={copyInstallCommand} />
                    )}
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {/* Searched Paths Section - only show if gcloud not found */}
      {!diagnostics.isValid && (
        <List.Section title="Searched Locations">
          {diagnostics.searchedPaths.map((path, index) => (
            <List.Item
              key={index}
              title={path}
              icon={{ source: Icon.Folder, tintColor: Color.SecondaryText }}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Path" content={path} />
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Help Section */}
      {!diagnostics.isValid && (
        <List.Section title="Need Help?">
          <List.Item
            title={diagnostics.installInstructions.title}
            subtitle={diagnostics.installInstructions.command || "Click to open installation guide"}
            icon={{ source: Icon.Download, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Installation Guide" url={diagnostics.installInstructions.url} />
                {diagnostics.installInstructions.command && (
                  <Action title="Copy Install Command" icon={Icon.Terminal} onAction={copyInstallCommand} />
                )}
              </ActionPanel>
            }
          />
          <List.Item
            title="Set Custom Path"
            subtitle="Open extension preferences to set a custom gcloud path"
            icon={{ source: Icon.Gear, tintColor: Color.Orange }}
            actions={
              <ActionPanel>
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
