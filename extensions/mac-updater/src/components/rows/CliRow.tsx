import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { CliPackage } from "../../utils/types";
import { SOURCE_META } from "../../utils/source-meta";
import { shortenVersion } from "../../utils/version";

interface Props {
  pkg: CliPackage;
  isBusy: boolean;
  showDetail: boolean;
  onUpdate: (pkg: CliPackage) => void;
  onUpdateEverything: () => void;
  onRefresh: () => void;
  onForceRescan: () => void;
}

/** A single CLI package row (npm / pip / gem / formula). */
export default function CliRow({
  pkg,
  isBusy,
  showDetail,
  onUpdate,
  onUpdateEverything,
  onRefresh,
  onForceRescan,
}: Props) {
  const meta = SOURCE_META[pkg.source];
  const hasUpdate = pkg.currentVersion !== pkg.latestVersion;

  const accessory: List.Item.Accessory = isBusy
    ? { icon: Icon.ArrowClockwise }
    : hasUpdate
      ? {
          tag: { value: shortenVersion(pkg.latestVersion), color: Color.Green },
          tooltip: `${pkg.currentVersion} → ${pkg.latestVersion}`,
        }
      : {
          icon: { source: Icon.Checkmark, tintColor: Color.SecondaryText },
          tooltip: `Up to date · ${pkg.currentVersion}`,
        };

  return (
    <List.Item
      key={`${pkg.source}-${pkg.id}`}
      icon={{ source: meta.icon, tintColor: meta.color }}
      title={pkg.name}
      subtitle={
        showDetail ? undefined : `${meta.label} · ${pkg.currentVersion}`
      }
      accessories={[accessory]}
      detail={
        showDetail ? (
          <List.Item.Detail
            markdown={`# ${pkg.name}\n\n\`${meta.label}\` package.\n\n**Installed:** ${pkg.currentVersion}  \n**Latest:** ${pkg.latestVersion}`}
          />
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title={`Update ${pkg.name}`}
            icon={Icon.ArrowClockwise}
            onAction={() => onUpdate(pkg)}
          />
          <Action
            title="Update Everything"
            icon={Icon.Rocket}
            onAction={onUpdateEverything}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            onAction={onRefresh}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Force Rescan (Clear Cache)"
            icon={Icon.RotateAntiClockwise}
            onAction={onForceRescan}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}
