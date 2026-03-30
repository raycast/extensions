import { Color, getPreferenceValues, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useDeferredValue, useState } from "react";
import { PackageActions } from "./components/package-actions";
import { RegistryPackageDetail } from "./components/package-detail";
import { getInstalledPackages } from "./lib/npm";
import { searchRegistryPackages } from "./lib/registry";

interface SearchPreferences {
  showMetadataPanel?: boolean;
}

export default function SearchCommand() {
  const { showMetadataPanel } = getPreferenceValues<SearchPreferences>();
  const [searchText, setSearchText] = useState("");
  const deferredSearchText = useDeferredValue(searchText.trim());

  const installed = useCachedPromise(getInstalledPackages, [], {
    keepPreviousData: true,
  });
  const searchResults = useCachedPromise(
    searchRegistryPackages,
    [deferredSearchText],
    {
      keepPreviousData: true,
      execute: deferredSearchText.length > 0,
    },
  );

  const installedByName = new Map(
    installed.data?.map((pkg) => [pkg.name, pkg]) ?? [],
  );
  const visibleResults =
    deferredSearchText.length > 0 ? (searchResults.data ?? []) : [];

  async function refreshInstalled() {
    await installed.revalidate();
  }

  return (
    <List
      isLoading={installed.isLoading || searchResults.isLoading}
      isShowingDetail={showMetadataPanel}
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search the npm registry"
    >
      {deferredSearchText.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search npm packages"
          description="Type a package name, keyword, or scope to search the registry."
        />
      ) : null}

      {deferredSearchText.length > 0 &&
      !searchResults.isLoading &&
      (searchResults.data?.length ?? 0) === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No packages found"
          description={`No results matched “${deferredSearchText}”.`}
        />
      ) : null}

      {visibleResults.map((pkg) => {
        const installedPackage = installedByName.get(pkg.name);
        const isOutdated = installedPackage
          ? installedPackage.version !== pkg.version
          : false;

        return (
          <List.Item
            key={pkg.name}
            title={pkg.name}
            subtitle={pkg.description}
            icon={{
              source: Icon.Box,
              tintColor: installedPackage ? Color.Green : undefined,
            }}
            accessories={[
              ...(installedPackage
                ? [
                    {
                      tag: {
                        value: isOutdated
                          ? `Installed ${installedPackage.version}`
                          : "Installed",
                        color: isOutdated ? Color.Orange : Color.Green,
                      },
                    },
                  ]
                : []),
              { text: pkg.version },
            ]}
            detail={
              showMetadataPanel ? (
                <RegistryPackageDetail
                  pkg={pkg}
                  installedVersion={installedPackage?.version}
                />
              ) : undefined
            }
            actions={
              <PackageActions
                packageName={pkg.name}
                npmUrl={pkg.npmUrl}
                repositoryUrl={pkg.repositoryUrl}
                homepageUrl={pkg.homepageUrl}
                canInstall={!installedPackage}
                canUpdate={Boolean(installedPackage)}
                canUninstall={Boolean(installedPackage)}
                latestVersion={pkg.version}
                onDidMutate={refreshInstalled}
              />
            }
          />
        );
      })}
    </List>
  );
}
