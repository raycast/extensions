import { Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { InstalledPackageDetail } from "./components/package-detail";
import { PackageActions } from "./components/package-actions";
import {
  getInstalledPackages,
  getOutdatedPackages,
  getPackageUrl,
} from "./lib/npm";

export default function OutdatedCommand() {
  const installed = useCachedPromise(getInstalledPackages, [], {
    keepPreviousData: true,
  });
  const outdated = useCachedPromise(getOutdatedPackages, [], {
    keepPreviousData: true,
  });

  const installedByName = new Map(
    installed.data?.map((pkg) => [pkg.name, pkg]) ?? [],
  );
  const packages = (outdated.data ?? []).map((pkg) => {
    const installedPackage = installedByName.get(pkg.name);

    return {
      ...installedPackage,
      name: pkg.name,
      version: pkg.current,
      latestVersion: pkg.latest,
      wantedVersion: pkg.wanted,
      path: pkg.location ?? installedPackage?.path,
      binNames: installedPackage?.binNames ?? [],
    };
  });

  async function refresh() {
    await Promise.all([installed.revalidate(), outdated.revalidate()]);
  }

  return (
    <List
      isLoading={installed.isLoading || outdated.isLoading}
      isShowingDetail
      searchBarPlaceholder="Search outdated global packages"
    >
      {!outdated.isLoading && packages.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="All your global packages are up to date"
        />
      ) : null}

      {packages.map((pkg) => (
        <List.Item
          key={pkg.name}
          title={pkg.name}
          subtitle={pkg.description}
          icon={{ source: Icon.ArrowClockwise, tintColor: Color.Orange }}
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
              updateAllEnabled
              latestVersion={pkg.latestVersion}
              onDidMutate={refresh}
            />
          }
        />
      ))}
    </List>
  );
}
