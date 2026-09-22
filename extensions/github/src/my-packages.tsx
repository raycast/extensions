import { List } from "@raycast/api";
import { useMemo, useState } from "react";

import PackageListEmptyView from "./components/PackageListEmptyView";
import PackageListItem from "./components/PackageListItem";
import PackageTypeDropdown, { ALL_PACKAGE_TYPES } from "./components/PackageTypeDropdown";
import { groupPackagesByType, PackageType } from "./helpers/package";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useMyPackages } from "./hooks/useMyPackages";

function MyPackages() {
  const { data, isLoading, error } = useMyPackages();
  const [packageType, setPackageType] = useState<string>(ALL_PACKAGE_TYPES);

  const packages = useMemo(() => data ?? [], [data]);

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
