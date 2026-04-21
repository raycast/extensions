import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { wingetInstall, wingetUninstall, wingetUpgrade, runInBackground } from "../utils/winget/actions";
import { Package, InstalledPackage, OutdatedPackage } from "../utils/winget/types";
import { PackageDetailView } from "./packageDetail";

type RefreshFn = () => void | Promise<void>;

/** Show an animated "Refreshing list…" toast, call the refresh function, then mark it done. */
async function refreshWithFeedback(onRefresh?: RefreshFn) {
  if (!onRefresh) return;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing list…" });
  try {
    await onRefresh();
    toast.style = Toast.Style.Success;
    toast.title = "List updated";
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "Refresh failed";
  }
}

interface SearchActionPanelProps {
  pkg: Package;
  isInstalled: boolean;
  onRefresh?: RefreshFn;
  onClearSearch?: () => void;
  onUninstalled?: (id: string) => void;
}

export function SearchActionPanel({
  pkg,
  isInstalled,
  onRefresh,
  onClearSearch,
  onUninstalled,
}: SearchActionPanelProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {isInstalled ? (
          <Action
            title="Uninstall"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={async () => {
              const success = await wingetUninstall(pkg.id);
              if (success) onUninstalled?.(pkg.id);
              onClearSearch?.();
              await refreshWithFeedback(onRefresh);
            }}
          />
        ) : (
          <Action
            title="Install"
            icon={Icon.Download}
            onAction={async () => {
              await wingetInstall(pkg.id);
              if (!runInBackground()) await refreshWithFeedback(onRefresh);
            }}
          />
        )}
        <Action.Push title="View Details" target={<PackageDetailView packageId={pkg.id} />} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => refreshWithFeedback(onRefresh)}
        />
        <Action.CopyToClipboard title="Copy Package ID" content={pkg.id} />
        <Action.CopyToClipboard title="Copy Install Command" content={`winget install --id ${pkg.id} --exact`} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

interface InstalledActionPanelProps {
  pkg: InstalledPackage;
  onRefresh?: RefreshFn;
  onClearSearch?: () => void;
  onUninstalled?: (id: string) => void;
}

export function InstalledActionPanel({ pkg, onRefresh, onClearSearch, onUninstalled }: InstalledActionPanelProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {pkg.available && (
          <Action
            title={`Upgrade to ${pkg.available}`}
            icon={Icon.ArrowUp}
            onAction={async () => {
              await wingetUpgrade(pkg.id);
              if (!runInBackground()) await refreshWithFeedback(onRefresh);
            }}
          />
        )}
        {pkg.id && <Action.Push title="View Details" target={<PackageDetailView packageId={pkg.id} />} />}
        <Action
          title="Uninstall"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={async () => {
            const success = await wingetUninstall(pkg.id);
            if (success) onUninstalled?.(pkg.id);
            onClearSearch?.();
            await refreshWithFeedback(onRefresh);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => refreshWithFeedback(onRefresh)}
        />
        {pkg.id && <Action.CopyToClipboard title="Copy Package ID" content={pkg.id} />}
        {pkg.id && (
          <Action.CopyToClipboard title="Copy Uninstall Command" content={`winget uninstall --id ${pkg.id} --exact`} />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

interface UpgradeActionPanelProps {
  pkg: OutdatedPackage;
  totalOutdated: number;
  onRefresh?: RefreshFn;
}

export function UpgradeActionPanel({ pkg, totalOutdated, onRefresh }: UpgradeActionPanelProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={`Upgrade to ${pkg.available}`}
          icon={Icon.ArrowUp}
          onAction={async () => {
            await wingetUpgrade(pkg.id);
            if (!runInBackground()) await refreshWithFeedback(onRefresh);
          }}
        />
        {totalOutdated > 1 && (
          <Action
            title={`Upgrade All (${totalOutdated} packages)`}
            icon={Icon.ArrowUp}
            onAction={async () => {
              await wingetUpgrade();
              if (!runInBackground()) await refreshWithFeedback(onRefresh);
            }}
          />
        )}
        <Action.Push title="View Details" target={<PackageDetailView packageId={pkg.id} />} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => refreshWithFeedback(onRefresh)}
        />
        <Action.CopyToClipboard title="Copy Package ID" content={pkg.id} />
        <Action.CopyToClipboard title="Copy Upgrade Command" content={`winget upgrade --id ${pkg.id} --exact`} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
