/**
 * The shared action panel.
 * While any operation runs, every mutating action is replaced by Cancel
 * Operation (confirmed — a habitual Enter must not kill a 10-minute install).
 * Destructive actions are styled and confirmed.
 */

import { Action, ActionPanel, Alert, confirmAlert, Icon, Keyboard } from "@raycast/api";

import { operationTitle } from "../core/feedback";
import { type OperationGate, type OperationRequest, type PackageTarget } from "../core/operations";
import { type UseOperationResult } from "../hooks/useOperation";
import { type PackageInfo } from "../utils/packages";

import { InstallVersionList } from "./InstallVersionList";

type ViewKind = "search" | "installed" | "upgradable";

interface PackageActionsProps {
  pkg: PackageInfo;
  viewKind: ViewKind;
  gate: OperationGate;
  ops: Pick<UseOperationResult, "launchDetached" | "runInline" | "cancelActive">;
  onUpdateIndex: () => void;
  homepage?: string;
  moniker?: string;
  /** Upgradable view: all non-pinned upgradable targets for Upgrade All. */
  upgradeAllTargets?: PackageTarget[];
  /** Installed view: all targets for Uninstall All (exclusions pre-applied). */
  uninstallAllTargets?: PackageTarget[];
}

function target(pkg: PackageInfo): PackageTarget {
  return { id: pkg.id, name: pkg.name, source: pkg.source };
}

const ALERT_DISMISSAL_SETTLE_MS = 150;

function settleAlertDismissalBeforeLaunch(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ALERT_DISMISSAL_SETTLE_MS));
}

function singleRequest(kind: OperationRequest["kind"], pkg: PackageInfo): Omit<OperationRequest, "requestId"> {
  return { kind, title: operationTitle(kind, pkg.name), target: target(pkg) };
}

function PackageActions({
  pkg,
  viewKind,
  gate,
  ops,
  onUpdateIndex,
  homepage,
  moniker,
  upgradeAllTargets,
  uninstallAllTargets,
}: PackageActionsProps) {
  const busy = gate.status === "busy";

  const install = () => void ops.launchDetached(singleRequest("install", pkg));
  const upgrade = () => void ops.launchDetached(singleRequest("upgrade", pkg));
  const repair = () => void ops.launchDetached(singleRequest("repair", pkg));
  const download = () => void ops.launchDetached(singleRequest("download", pkg));
  const pin = () => void ops.runInline(singleRequest("pin", pkg));
  const unpin = () => void ops.runInline(singleRequest("unpin", pkg));
  const uninstall = async () => {
    // Multi-version installs must target this row's exact version — winget
    // refuses an ambiguous uninstall. The confirm names the version so the
    // user knows which of the side-by-side rows is going.
    const versioned = pkg.hasSiblingVersions ? pkg.installedVersion : undefined;
    const confirmed = await confirmAlert({
      title: `Uninstall ${pkg.name}${versioned ? ` ${versioned}` : ""}?`,
      icon: Icon.Trash,
      primaryAction: {
        title: "Uninstall",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await settleAlertDismissalBeforeLaunch();
      void ops.launchDetached({
        ...singleRequest("uninstall", pkg),
        version: versioned,
      });
    }
  };
  const upgradeAll = () => {
    if (!upgradeAllTargets || upgradeAllTargets.length === 0) {
      return;
    }
    void ops.launchDetached({
      kind: "upgrade-all",
      title: operationTitle("upgrade-all"),
      targets: upgradeAllTargets,
    });
  };
  const uninstallAll = async () => {
    if (!uninstallAllTargets || uninstallAllTargets.length === 0) {
      return;
    }
    const confirmed = await confirmAlert({
      title: `Uninstall ${uninstallAllTargets.length} packages?`,
      message: "Every WinGet-managed package in this list will be uninstalled. This cannot be undone.",
      icon: Icon.Trash,
      primaryAction: {
        title: "Uninstall All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await settleAlertDismissalBeforeLaunch();
      void ops.launchDetached({
        kind: "uninstall-all",
        title: operationTitle("uninstall-all"),
        targets: uninstallAllTargets,
      });
    }
  };

  // Primary action: most likely intent for the row's current state.
  const primary = (() => {
    if (busy) {
      return <Action title="Cancel Operation" icon={Icon.XMarkCircle} onAction={() => void ops.cancelActive()} />;
    }
    if (viewKind === "search" && !pkg.isInstalled) {
      return <Action title="Install" icon={Icon.Plus} onAction={install} />;
    }
    if (pkg.isInstalled && pkg.hasUpdate && !pkg.isPinned) {
      return (
        <Action title="Upgrade" icon={Icon.ArrowUp} shortcut={{ modifiers: ["cmd"], key: "u" }} onAction={upgrade} />
      );
    }
    if (pkg.isInstalled && pkg.isPinned) {
      return <Action title="Unpin" icon={Icon.PinDisabled} onAction={unpin} />;
    }
    if (pkg.isInstalled) {
      return (
        <Action
          title="Uninstall"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => void uninstall()}
        />
      );
    }
    return <Action title="Install" icon={Icon.Plus} onAction={install} />;
  })();

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {primary}
        {!busy && (
          <>
            {!pkg.isInstalled && (
              <Action.Push
                title="Install Version…"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<InstallVersionList pkg={pkg} />}
              />
            )}
            {!pkg.isInstalled && (
              <Action
                title="Download Installer"
                icon={Icon.Download}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={download}
              />
            )}
            {/* Uninstall appears here only when it is NOT already the primary
                action (i.e. an upgrade or unpin outranks it). */}
            {pkg.isInstalled && (pkg.hasUpdate || pkg.isPinned) && (
              <Action
                title="Uninstall"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => void uninstall()}
              />
            )}
          </>
        )}
      </ActionPanel.Section>

      {!busy && (
        <ActionPanel.Section>
          {pkg.isInstalled && !pkg.isPinned && (
            <Action
              title="Pin to Prevent Updates"
              icon={Icon.Pin}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={pin}
            />
          )}
          {pkg.isInstalled && pkg.isPinned && (
            <Action title="Unpin" icon={Icon.PinDisabled} shortcut={Keyboard.Shortcut.Common.Pin} onAction={unpin} />
          )}
          {pkg.isInstalled && <Action title="Repair" icon={Icon.Hammer} onAction={repair} />}
        </ActionPanel.Section>
      )}

      {!busy && upgradeAllTargets && upgradeAllTargets.length > 0 && (
        <ActionPanel.Section>
          <Action
            title={`Upgrade All (${upgradeAllTargets.length})`}
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            onAction={upgradeAll}
          />
        </ActionPanel.Section>
      )}

      {homepage && (
        <ActionPanel.Section>
          <Action.OpenInBrowser title="Open Homepage" url={homepage} />
        </ActionPanel.Section>
      )}

      <ActionPanel.Section>
        <Action
          title="Update Index"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onUpdateIndex}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Package ID" content={pkg.id} shortcut={{ modifiers: ["cmd"], key: "." }} />
        <Action.CopyToClipboard
          title="Copy Package Name"
          content={pkg.name}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
        {moniker && <Action.CopyToClipboard title="Copy Moniker" content={moniker} />}
        <Action.CopyToClipboard
          title="Copy Version"
          content={pkg.installedVersion ?? pkg.version}
          shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
        />
        <Action.CopyToClipboard title="Copy Install Command" content={`winget install --exact --id ${pkg.id}`} />
        {pkg.hasUpdate && (
          <Action.CopyToClipboard title="Copy Upgrade Command" content={`winget upgrade --exact --id ${pkg.id}`} />
        )}
        {pkg.isInstalled && (
          <Action.CopyToClipboard title="Copy Uninstall Command" content={`winget uninstall --exact --id ${pkg.id}`} />
        )}
      </ActionPanel.Section>

      {/* Always last: the most destructive action must not sit next to
          anything a user might reach for habitually. */}
      {!busy && uninstallAllTargets && uninstallAllTargets.length > 0 && (
        <ActionPanel.Section>
          <Action
            title={`Uninstall All (${uninstallAllTargets.length})…`}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => void uninstallAll()}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}

export { PackageActions, type ViewKind };
