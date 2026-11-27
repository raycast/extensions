import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
  CliResult,
  InstalledPackage,
  OutdatedPackage,
} from "../choco/types";
import { InstallVersionForm } from "./InstallVersionForm";
import { PackageInfoDetail } from "./PackageInfoDetail";

export type PackageTaskStatus = "completed" | "launched" | "failed";

export async function runPackageTask(options: {
  loadingTitle: string;
  successTitle: string;
  errorTitle: string;
  task: () => Promise<CliResult | void>;
}): Promise<PackageTaskStatus> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: options.loadingTitle,
  });

  try {
    const result = await options.task();
    if (result && result.launchedInTerminal) {
      toast.style = Toast.Style.Success;
      toast.title = "Opened in Terminal";
      toast.message = "Finish the operation in the terminal, then refresh.";
      return "launched";
    }
    toast.style = Toast.Style.Success;
    toast.title = options.successTitle;
    return "completed";
  } catch (error) {
    if (
      error instanceof ElevationCanceledError ||
      (error as Error).name === "ElevationCanceledError"
    ) {
      toast.style = Toast.Style.Failure;
      toast.title = "Elevation Canceled";
      toast.message =
        "Administrator permission is required to modify packages.";
      return "failed";
    }
    await toast.hide();
    await showFailureToast(error, { title: options.errorTitle });
    return "failed";
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
    const status = await runPackageTask({
      loadingTitle: forceTerminal
        ? `Opening terminal to install ${id}...`
        : `Installing ${id}...`,
      successTitle: `Installed ${id}`,
      errorTitle: `Failed to install ${id}`,
      task: () => installPackage(id, { forceTerminal }),
    });
    if (status === "completed") {
      onRefresh();
    }
  }

  async function handleUpgrade(forceTerminal = false) {
    const status = await runPackageTask({
      loadingTitle: forceTerminal
        ? `Opening terminal to upgrade ${id}...`
        : `Upgrading ${id}...`,
      successTitle: `Upgraded ${id}`,
      errorTitle: `Failed to upgrade ${id}`,
      task: () => upgradePackage(id, { forceTerminal }),
    });
    if (status === "completed") {
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

    const status = await runPackageTask({
      loadingTitle: forceTerminal
        ? `Opening terminal to uninstall ${id}...`
        : `Uninstalling ${id}...`,
      successTitle: `Uninstalled ${id}`,
      errorTitle: `Failed to uninstall ${id}`,
      task: () => uninstallPackage(id, { forceTerminal }),
    });
    if (status === "completed") {
      onRefresh();
    }
  }

  async function handleTogglePin() {
    if (!installed) {
      return;
    }
    const willPin = !installed.pinned;
    const status = await runPackageTask({
      loadingTitle: willPin ? `Pinning ${id}...` : `Unpinning ${id}...`,
      successTitle: willPin ? `Pinned ${id}` : `Unpinned ${id}`,
      errorTitle: `Failed to ${willPin ? "pin" : "unpin"} ${id}`,
      task: () => (willPin ? pinPackage(id) : unpinPackage(id)),
    });
    if (status === "completed") {
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
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={handleTogglePin}
          />
        )}
        {installed && (
          <Action
            title="Uninstall Package"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
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
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "enter" },
            Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
          }}
          onAction={() =>
            installed ? handleUpgrade(true) : handleInstall(true)
          }
        />
        <Action.Push
          title="Show Choco Info"
          icon={Icon.Info}
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "i" },
            Windows: { modifiers: ["ctrl"], key: "i" },
          }}
          target={<PackageInfoDetail packageId={id} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Links & Clipboard">
        <Action.CopyToClipboard
          title="Copy Install Command"
          content={`choco install ${id} -y`}
          shortcut={Keyboard.Shortcut.Common.Copy}
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
