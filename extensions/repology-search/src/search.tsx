import { useState } from "react";
import { ActionPanel, Action, Icon, List, Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PackageDetail } from "./PackageDetail";
import { Package } from "./types";

type PackageSections = {
  [key: string]: Package[];
};

function getUniqueSortedRepos(packages: Package[]): string[] {
  const allRepos = packages.map((pkg) => pkg.repo);
  const uniqueRepos = Array.from(new Set(allRepos));
  uniqueRepos.sort((a, b) => a.localeCompare(b));
  return uniqueRepos;
}

function getFilteredPackages(packages: Package[], selectedRepo: string): Package[] {
  return packages.filter((pkg) => selectedRepo === "" || pkg.repo === selectedRepo);
}

function groupPackagesByRepo(packages: Package[]): PackageSections {
  return packages.reduce<PackageSections>((sections, pkg) => {
    const sectionKey = pkg.repo;
    if (!sections[sectionKey]) {
      sections[sectionKey] = [];
    }
    sections[sectionKey].push(pkg);
    return sections;
  }, {});
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedRepo, setSelectedRepo] = useState("");
  const { isLoading, data, error } = useFetch<{ [key: string]: Package[] }>(
    `https://repology.org/api/v1/project/${searchText}`,
    {
      keepPreviousData: true,
      execute: searchText.length >= 2,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
      },
    },
  );

  if (error) {
    showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
  }

  const packages = data ? Object.values(data).flat() : [];
  const repos = getUniqueSortedRepos(packages);
  const filteredPackages = getFilteredPackages(packages, selectedRepo);
  const packageSections = groupPackagesByRepo(filteredPackages);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for packages"
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Select Repository" storeValue={true} onChange={setSelectedRepo}>
          <List.Dropdown.Item title="All Repositories" value="" />
          {repos.map((repo) => (
            <List.Dropdown.Item key={repo} title={repo} value={repo} />
          ))}
        </List.Dropdown>
      }
    >
      {searchText.length < 2 ? (
        <List.EmptyView title="No Results" />
      ) : (
        Object.entries(packageSections).map(([sectionTitle, packages]) => (
          <List.Section key={sectionTitle} title={sectionTitle}>
            {packages.map((pkg, index) => (
              <List.Item
                key={`${pkg.repo}-${index}`}
                title={pkg.visiblename || pkg.binname || pkg.srcname}
                subtitle={pkg.summary || ""}
                accessories={[{ text: pkg.version }]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Details"
                      icon={Icon.AppWindowSidebarRight}
                      target={<PackageDetail pkg={pkg} />}
                    />
                    <Action.CopyToClipboard content={pkg.visiblename || pkg.binname || pkg.srcname} />
                    <Action.OpenInBrowser
                      url={`https://repology.org/projects/?search=${
                        pkg.visiblename || pkg.binname || pkg.srcname
                      }&maintainer=&category=&inrepo=${
                        pkg.repo
                      }&notinrepo=&repos=&families=&repos_newest=&families_newest=`}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
