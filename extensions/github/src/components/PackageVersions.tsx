import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { format, formatDistanceToNow } from "date-fns";

import { getErrorMessage } from "../helpers/errors";
import { getPackageIcon, getPackageVersionTags, Package } from "../helpers/package";
import { usePackageVersions } from "../hooks/usePackageVersions";

type PackageVersionsProps = {
  pkg: Package;
};

export default function PackageVersions({ pkg }: PackageVersionsProps) {
  const { data, isLoading, error, pagination } = usePackageVersions(pkg);

  const versions = data ?? [];
  const versionCount = versions.length > 0 ? `${versions.length}${pagination?.hasMore ? "+" : ""}` : undefined;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={pkg.name}
      searchBarPlaceholder="Filter versions"
      pagination={pagination}
    >
      <List.Section title="Versions" subtitle={versionCount}>
        {versions.map((version) => {
          const tags = getPackageVersionTags(version);
          const createdAt = new Date(version.created_at);
          const url = version.html_url ?? pkg.html_url;

          return (
            <List.Item
              key={version.id}
              icon={getPackageIcon(pkg.package_type)}
              title={version.name}
              subtitle={tags.length > 0 ? tags.join(", ") : undefined}
              accessories={[
                {
                  date: createdAt,
                  tooltip: `Published ${format(createdAt, "dd MMM yyyy 'at' HH:mm")} (${formatDistanceToNow(createdAt, { addSuffix: true })})`,
                },
              ]}
              actions={
                <ActionPanel title={`Version: ${version.name}`}>
                  <Action.OpenInBrowser title="Open in GitHub" icon={Icon.Globe} url={url} />
                  <Action.CopyToClipboard
                    title="Copy Version Name"
                    content={version.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Version URL"
                    content={url}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Failed to Load Versions" description={getErrorMessage(error)} />
      ) : (
        <List.EmptyView
          icon={{ source: Icon.Box, tintColor: Color.SecondaryText }}
          title="No Versions"
          description="This package doesn't have any published version."
        />
      )}
    </List>
  );
}
