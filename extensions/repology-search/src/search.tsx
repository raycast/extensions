import { useState, useEffect, useMemo } from "react";
import { ActionPanel, Action, List, Toast, showToast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PackageDetail } from "./PackageDetail";
import { Package } from "./types";

// Define a type for your sections
type PackageSections = {
  [key: string]: Package[];
};

export default function Command() {
  const [inputValue, setInputValue] = useState<string>("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue.length >= 2) {
        setDebouncedQuery(inputValue);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [inputValue]);

  const { data, isLoading, error } = useFetch<{ [key: string]: Package[] }>(
    `https://repology.org/api/v1/project/${debouncedQuery}`,
    {
      keepPreviousData: true,
      execute: debouncedQuery.length >= 2,
    },
  );

  if (error) {
    showToast(Toast.Style.Failure, "Failed to fetch data", error.message);
  }

  const packages = data ? Object.values(data).flat() : [];

  // Extract unique repositories for the dropdown
  const repos = useMemo(() => {
    const allRepos = packages.map((pkg) => pkg.repo);
    return Array.from(new Set(allRepos));
  }, [packages]);

  // Filter packages based on the selected repository
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => selectedRepo === "" || pkg.repo === selectedRepo);
  }, [packages, selectedRepo]);

  // Grouping and sorting filtered packages within each section
  const packageSections = filteredPackages.reduce<PackageSections>((sections, pkg) => {
    const sectionKey = pkg.repo;
    if (!sections[sectionKey]) {
      sections[sectionKey] = [];
    }
    sections[sectionKey].push(pkg);
    return sections;
  }, {});

  // Sort each section's packages by srcname
  for (const section in packageSections) {
    packageSections[section].sort((a, b) => a.srcname.localeCompare(b.srcname));
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setInputValue}
      searchBarPlaceholder="Search for packages"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Repository" storeValue={true} onChange={setSelectedRepo}>
          <List.Dropdown.Item title="All Repositories" value="" />
          {repos.map((repo) => (
            <List.Dropdown.Item key={repo} title={repo} value={repo} />
          ))}
        </List.Dropdown>
      }
    >
      {Object.keys(packageSections).length > 0 ? (
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
                    <Action.Push title="Show Details" target={<PackageDetail pkg={pkg} />} />
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
      ) : (
        <List.EmptyView title="No packages found" description="Try a different search query" />
      )}
    </List>
  );
}
