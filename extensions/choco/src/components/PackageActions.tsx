import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import {
  ElevationCanceledError,
  installPackage,
  pinPackage,
  uninstallPackage,
  unpinPackage,
  upgradePackage,
} from "../choco/cli";
import {
  ChocoPackage,
  InstalledPackage,
  OutdatedPackage,
} from "../choco/types";
import { InstallVersionForm } from "./InstallVersionForm";
import { PackageInfoDetail } from "./PackageInfoDetail";

export async function runPackageTask(options: {
  loadingTitle: string;
  successTitle: string;
  errorTitle: string;
  task: () => Promise<unknown>;
}): Promise<boolean> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: options.loadingTitle,
  });

  try {
    await options.task();
    toast.style = Toast.Style.Success;
    toast.title = options.successTitle;
    return true;
  } catch (error) {
    if (
      error instanceof ElevationCanceledError ||
      (error as Error).name === "ElevationCanceledError"
    ) {
      toast.style = Toast.Style.Failure;
      toast.title = "Elevation Canceled";
      toast.message =
        "Administrator permission is required to modify packages.";
      return false;
    }
    toast.style = Toast.Style.Failure;
    toast.title = options.errorTitle;
    toast.message = error instanceof Error ? error.message : String(error);
    return false;
  }
}

interface PackageActionsProps {
  id: string;
  pkg?: ChocoPackage;
  installed?: InstalledPackage;
  outdated?: OutdatedPackage;
  onRefresh: () => void;
  extraTopActions?: React.ReactNode;
}

export function PackageActions({
  id,
  pkg,
  installed,
  outdated,
  onRefresh,
  extraTopActions,
}: PackageActionsProps) {
  const packageUrl =
    pkg?.packageUrl ??
    `https://community.chocolatey.org/packages/${encodeURIComponent(id)}`;

  async function handleInstall(forceTerminal = false) {
    const ok = await runPackageTask({
      loadingTitle: forceTerminal
        ? `Opening terminal to install ${id}...`
        : `Installing ${id}...`,
      successTitle: forceTerminal
        ? `Launched installer for ${id}`
        : `Installed ${id}`,
      errorTitle: `Failed to install ${id}`,
      task: () => installPackage(id, { forceTerminal }),
    });
    if (ok) {
      onRefresh();
    }
  }

  async function handleUpgrade(forceTerminal = false) {
    const ok = await runPackageTask({
      loadingTitle: forceTerminal
        ? `Opening terminal to upgrade ${id}...`
        : `Upgrading ${id}...`,
      successTitle: forceTerminal
        ? `Launched upgrader for ${id}`
        : `Upgraded ${id}`,
      errorTitle: `Failed to upgrade ${id}`,
      task: () => upgradePackage(id, { forceTerminal }),
    });
    if (ok) {
      onRefresh();
    }
  }

  async function handleUninstall(forceTerminal = false) {
    const confirmed = await confirmAlert({
      title: `Uninstall ${id}?`,
      message: `This will remove ${id}${installed ? ` (${installed.version})` : ""} via Chocolatey.`,
      primaryAction: {
        title: "Uninstall",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }

    const ok = await runPackageTask({
      loadingTitle: `Uninstalling ${id}...`,
      successTitle: `Uninstalled ${id}`,
      errorTitle: `Failed to uninstall ${id}`,
      task: () => uninstallPackage(id, { forceTerminal }),
    });
    if (ok) {
      onRefresh();
    }
  }

  async function handleTogglePin() {
    if (!installed) {
      return;
    }
    const willPin = !installed.pinned;
    const ok = await runPackageTask({
      loadingTitle: willPin ? `Pinning ${id}...` : `Unpinning ${id}...`,
      successTitle: willPin ? `Pinned ${id}` : `Unpinned ${id}`,
      errorTitle: `Failed to ${willPin ? "pin" : "unpin"} ${id}`,
      task: () => (willPin ? pinPackage(id) : unpinPackage(id)),
    });
    if (ok) {
      onRefresh();
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {extraTopActions}
        {outdated && (
          <Action
            title={`Upgrade to ${outdated.availableVersion}`}
            icon={Icon.ArrowUpCircle}
            onAction={() => handleUpgrade(false)}
          />
        )}
        {!installed && (
          <Action
            title="Install Package"
            icon={Icon.Download}
            onAction={() => handleInstall(false)}
          />
        )}
        {installed && !outdated && (
          <Action
            title="Upgrade Package"
            icon={Icon.ArrowUpCircle}
            onAction={() => handleUpgrade(false)}
          />
        )}
        {installed && (
          <Action
            title={installed.pinned ? "Unpin Package" : "Pin Package"}
            icon={installed.pinned ? Icon.LockUnlocked : Icon.Pin}
            shortcut={{ modifiers: ["ctrl"], key: "p" }}
            onAction={handleTogglePin}
          />
        )}
        {installed && (
          <Action
            title="Uninstall Package"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => handleUninstall(false)}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section title="Advanced">
        <Action.Push
          title="Install Specific Version"
          icon={Icon.Tag}
          target={
            <InstallVersionForm
              packageId={id}
              suggestedVersion={pkg?.version}
              onSuccess={onRefresh}
            />
          }
        />
        <Action
          title={installed ? "Upgrade in Terminal" : "Install in Terminal"}
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "enter" }}
          onAction={() =>
            installed ? handleUpgrade(true) : handleInstall(true)
          }
        />
        <Action.Push
          title="Show Choco Info"
          icon={Icon.Info}
          shortcut={{ modifiers: ["ctrl"], key: "i" }}
          target={<PackageInfoDetail packageId={id} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Links & Clipboard">
        <Action.CopyToClipboard
          title="Copy Install Command"
          content={`choco install ${id} -y`}
          shortcut={{ modifiers: ["ctrl"], key: "c" }}
        />
        <Action.CopyToClipboard title="Copy Package ID" content={id} />
        <Action.OpenInBrowser title="Open on Chocolatey" url={packageUrl} />
        {pkg?.projectUrl && (
          <Action.OpenInBrowser
            title="Open Project Homepage"
            url={pkg.projectUrl}
          />
        )}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
