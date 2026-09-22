import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";

import PackageListEmptyView from "./components/PackageListEmptyView";
import PackageListItem from "./components/PackageListItem";
import PackageTypeDropdown, { ALL_PACKAGE_TYPES } from "./components/PackageTypeDropdown";
import { getPackageTypeTitle, groupPackagesByType, PackageType } from "./helpers/package";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyPackages } from "./hooks/useMyPackages";

function MyPackages() {
  const { data, isLoading, error, revalidate } = useMyPackages();
  const [packageType, setPackageType] = useState<string>(ALL_PACKAGE_TYPES);

  const packages = useMemo(() => data?.packages ?? [], [data]);
  const failedTypes = data?.failedTypes ?? [];

  const availableTypes = useMemo(
    () => [...new Set(packages.map((pkg) => pkg.package_type))] as PackageType[],
    [packages],
  );

  const sections = useMemo(() => {
    const filtered =
      packageType === ALL_PACKAGE_TYPES ? packages : packages.filter((pkg) => pkg.package_type === packageType);

    return groupPackagesByType(filtered);
  }, [packages, packageType]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter packages by name"
      searchBarAccessory={
        availableTypes.length > 1 ? (
          <PackageTypeDropdown packageTypes={availableTypes} setPackageType={setPackageType} />
        ) : undefined
      }
    >
      {failedTypes.length > 0 ? (
        <List.Section title="Incomplete">
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title={`Couldn't load ${failedTypes.map(getPackageTypeTitle).join(", ")}`}
            subtitle="Some packages may be missing from this list"
            actions={
              <ActionPanel>
                <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {sections.length > 0 ? (
        sections.map((section) => (
          <List.Section key={section.packageType} title={section.title} subtitle={`${section.packages.length}`}>
            {section.packages.map((pkg) => (
              <PackageListItem key={pkg.id} pkg={pkg} />
            ))}
          </List.Section>
        ))
      ) : (
        <PackageListEmptyView isLoading={isLoading} error={error} />
      )}
    </List>
  );
}

export default withGitHubClient(MyPackages);
