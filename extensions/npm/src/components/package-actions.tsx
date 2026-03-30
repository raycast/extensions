import { Action, ActionPanel, Alert, confirmAlert, Icon } from "@raycast/api";
import {
  buildInstallCommand,
  buildUninstallCommand,
  buildUpdateAllCommand,
  buildUpdateCommand,
  installGlobalPackage,
  uninstallGlobalPackage,
  updateAllGlobalPackages,
  updateGlobalPackage,
} from "../lib/npm";

interface PackageActionsProps {
  packageName: string;
  npmUrl: string;
  repositoryUrl?: string;
  homepageUrl?: string;
  canInstall?: boolean;
  canUpdate?: boolean;
  canUninstall?: boolean;
  updateAllEnabled?: boolean;
  latestVersion?: string;
  onDidMutate?: () => void | Promise<void>;
}

async function runAndRefresh(
  action: () => Promise<void>,
  onDidMutate?: () => void | Promise<void>,
) {
  await action();

  if (onDidMutate) {
    await onDidMutate();
  }
}

export function PackageActions(props: PackageActionsProps) {
  const updateTitle = props.latestVersion
    ? `Update to ${props.latestVersion}`
    : "Update Package";

  return (
    <ActionPanel>
      <ActionPanel.Section title="Manage">
        {props.canInstall ? (
          <Action
            title="Install Package"
            icon={Icon.Download}
            onAction={() =>
              runAndRefresh(
                () => installGlobalPackage(props.packageName),
                props.onDidMutate,
              )
            }
          />
        ) : null}
        {props.canUpdate ? (
          <Action
            title={updateTitle}
            icon={Icon.Download}
            onAction={() =>
              runAndRefresh(
                () => updateGlobalPackage(props.packageName),
                props.onDidMutate,
              )
            }
          />
        ) : null}
        {props.updateAllEnabled ? (
          <Action
            title="Update All Global Packages"
            icon={Icon.ArrowClockwise}
            onAction={() =>
              runAndRefresh(() => updateAllGlobalPackages(), props.onDidMutate)
            }
          />
        ) : null}
        {props.canUninstall ? (
          <Action
            title="Uninstall Package"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: `Uninstall ${props.packageName}?`,
                message: `This will run ${buildUninstallCommand(props.packageName)}.`,
                primaryAction: {
                  title: "Uninstall",
                  style: Alert.ActionStyle.Destructive,
                },
              });

              if (!confirmed) {
                return;
              }

              await runAndRefresh(
                () => uninstallGlobalPackage(props.packageName),
                props.onDidMutate,
              );
            }}
          />
        ) : null}
      </ActionPanel.Section>

      <ActionPanel.Section title="Open">
        <Action.OpenInBrowser title="Open on npm" url={props.npmUrl} />
        {props.repositoryUrl ? (
          <Action.OpenInBrowser
            title="Open Repository"
            url={props.repositoryUrl}
          />
        ) : null}
        {props.homepageUrl ? (
          <Action.OpenInBrowser title="Open Homepage" url={props.homepageUrl} />
        ) : null}
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Install Command"
          content={buildInstallCommand(props.packageName)}
        />
        {props.canUpdate ? (
          <Action.CopyToClipboard
            title="Copy Update Command"
            content={buildUpdateCommand(props.packageName)}
          />
        ) : null}
        {props.updateAllEnabled ? (
          <Action.CopyToClipboard
            title="Copy Update All Command"
            content={buildUpdateAllCommand()}
          />
        ) : null}
        {props.canUninstall ? (
          <Action.CopyToClipboard
            title="Copy Uninstall Command"
            content={buildUninstallCommand(props.packageName)}
          />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
