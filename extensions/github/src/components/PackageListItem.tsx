import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { format, formatDistanceToNow } from "date-fns";

import { pluralize } from "../helpers";
import {
  getPackageIcon,
  getPackageTypeTitle,
  getPackageVersionCount,
  isPrivatePackage,
  Package,
} from "../helpers/package";

import PackageVersions from "./PackageVersions";

type PackageListItemProps = {
  pkg: Package;
};

export default function PackageListItem({ pkg }: PackageListItemProps) {
  const updatedAt = new Date(pkg.updated_at);
  const versionCount = getPackageVersionCount(pkg);
  const accessories: List.Item.Accessory[] = [];

  if (isPrivatePackage(pkg)) {
    accessories.push({
      icon: { source: Icon.Lock, tintColor: Color.Orange },
      tooltip: "This package is private",
    });
  }

  // The API omits `version_count` for some packages; the drill-down has the real list.
  if (versionCount !== undefined) {
    accessories.push({
      text: `${versionCount}`,
      icon: { source: Icon.Tag, tintColor: Color.SecondaryText },
      tooltip: pluralize(versionCount, "version", { withNumber: true }),
    });
  }

  accessories.push({
    date: updatedAt,
    tooltip: `Updated ${format(updatedAt, "dd MMM yyyy 'at' HH:mm")} (${formatDistanceToNow(updatedAt, { addSuffix: true })})`,
  });

  return (
    <List.Item
      icon={getPackageIcon(pkg.package_type)}
      title={pkg.name}
      subtitle={pkg.repository?.full_name ?? getPackageTypeTitle(pkg.package_type)}
      keywords={[pkg.package_type, getPackageTypeTitle(pkg.package_type)]}
      accessories={accessories}
      actions={
        <ActionPanel title={`Package: ${pkg.name}`}>
          <Action.OpenInBrowser title="Open in GitHub" icon={Icon.Globe} url={pkg.html_url} />
          <Action.Push
            title="Show Versions"
            icon={Icon.Tag}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            target={<PackageVersions pkg={pkg} />}
          />

          {pkg.repository ? (
            <Action.OpenInBrowser
              title="Open Repository"
              icon={Icon.Folder}
              url={pkg.repository.html_url}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          ) : null}

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Package Name"
              content={pkg.name}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action.CopyToClipboard
              title="Copy Package URL"
              content={pkg.html_url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
