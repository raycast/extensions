import { Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { InstalledPackageDetail } from "./components/package-detail";
import { PackageActions } from "./components/package-actions";
import {
  getInstalledPackages,
  getOutdatedPackages,
  getPackageUrl,
} from "./lib/npm";

export default function InstalledCommand() {
  const installed = useCachedPromise(getInstalledPackages, [], {
    keepPreviousData: true,
  });
  const outdated = useCachedPromise(getOutdatedPackages, [], {
    keepPreviousData: true,
  });

  const outdatedByName = new Map(
    outdated.data?.map((item) => [item.name, item]) ?? [],
  );
  const packages = (installed.data ?? []).map((pkg) => {
    const update = outdatedByName.get(pkg.name);

    return {
      ...pkg,
      latestVersion: update?.latest,
      wantedVersion: update?.wanted,
    };
  });

  const outdatedPackages = packages.filter((pkg) => pkg.latestVersion);
  const currentPackages = packages.filter((pkg) => !pkg.latestVersion);

  async function refresh() {
    await Promise.all([installed.revalidate(), outdated.revalidate()]);
  }

  return (
    <List
      isLoading={installed.isLoading || outdated.isLoading}
      isShowingDetail
      searchBarPlaceholder="Search installed global packages"
    >
      {!installed.isLoading && packages.length === 0 ? (
        <List.EmptyView
          icon={Icon.Box}
          title="No global npm packages found"
          description="Install a package from the Search command to get started."
        />
      ) : null}

      {outdatedPackages.length > 0 ? (
        <List.Section title={`Outdated (${outdatedPackages.length})`}>
          {outdatedPackages.map((pkg) => (
            <List.Item
              key={pkg.name}
              title={pkg.name}
              subtitle={pkg.description}
              icon={{ source: Icon.Box, tintColor: Color.Orange }}
              accessories={[
                {
                  tag: {
                    value: `Latest ${pkg.latestVersion}`,
                    color: Color.Orange,
                  },
                },
                { text: pkg.version },
              ]}
              detail={<InstalledPackageDetail pkg={pkg} />}
              actions={
                <PackageActions
                  packageName={pkg.name}
                  npmUrl={getPackageUrl(pkg.name)}
                  repositoryUrl={pkg.repositoryUrl}
                  homepageUrl={pkg.homepageUrl}
                  canUpdate
                  canUninstall
                  latestVersion={pkg.latestVersion}
                  onDidMutate={refresh}
                />
              }
            />
          ))}
        </List.Section>
      ) : null}

      {currentPackages.length > 0 ? (
        <List.Section title={`Installed (${currentPackages.length})`}>
          {currentPackages.map((pkg) => (
            <List.Item
              key={pkg.name}
              title={pkg.name}
              subtitle={pkg.description}
              icon={{ source: Icon.Box, tintColor: Color.Green }}
              accessories={[{ text: pkg.version }]}
              detail={<InstalledPackageDetail pkg={pkg} />}
              actions={
                <PackageActions
                  packageName={pkg.name}
                  npmUrl={getPackageUrl(pkg.name)}
                  repositoryUrl={pkg.repositoryUrl}
                  homepageUrl={pkg.homepageUrl}
                  canUpdate
                  canUninstall
                  onDidMutate={refresh}
                />
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
