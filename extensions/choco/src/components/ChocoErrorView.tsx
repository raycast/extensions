import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import { ChocoNotFoundError } from "../choco/cli";

const INSTALL_SCRIPT =
  "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))";

interface ChocoErrorViewProps {
  error: Error;
  onRetry?: () => void;
}

export function ChocoErrorView({ error, onRetry }: ChocoErrorViewProps) {
  const isMissing =
    error instanceof ChocoNotFoundError || error.name === "ChocoNotFoundError";

  const markdown = isMissing
    ? [
        "# Chocolatey Not Found",
        "",
        error.message,
        "",
        "To use this extension, install Chocolatey or configure a custom `choco.exe` path in extension preferences.",
        "",
        "## Quick Install (Run in Elevated PowerShell)",
        "",
        "```powershell",
        INSTALL_SCRIPT,
        "```",
      ].join("\n")
    : ["# Chocolatey Error", "", "```text", error.message, "```"].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {onRetry && (
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
            />
          )}
          {isMissing && (
            <>
              <Action.CopyToClipboard
                title="Copy Install Script"
                content={INSTALL_SCRIPT}
              />
              <Action.OpenInBrowser
                title="Open Chocolatey Install Guide"
                url="https://chocolatey.org/install"
              />
            </>
          )}
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
