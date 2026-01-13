import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useState, useEffect } from "react";
import { searchPackages, getPackageURL, getPackageExamplesURL, getPackageDocsURL, GoPackage } from "./api/pkggo";

export default function SearchPackages() {
  const [searchText, setSearchText] = useState("");
  const [packages, setPackages] = useState<GoPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchPackages() {
      if (searchText.length === 0) {
        setPackages([]);
        return;
      }

      setIsLoading(true);
      const results = await searchPackages(searchText, 50);
      setPackages(results);
      setIsLoading(false);
    }

    fetchPackages();
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Go packages... (e.g., http, json, crypto)"
      throttle
    >
      {searchText.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          title="Search for Go Packages"
          description="Start typing to search for packages from pkg.go.dev and the standard library"
        />
      ) : packages.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.QuestionMark, tintColor: Color.Orange }}
          title="No packages found"
          description={`No packages found for "${searchText}". Try a different search term.`}
        />
      ) : (
        packages.map((pkg) => <PackageListItem key={pkg.path} pkg={pkg} />)
      )}
    </List>
  );
}

function PackageListItem({ pkg }: { pkg: GoPackage }) {
  return (
    <List.Item
      title={pkg.path}
      subtitle={pkg.synopsis}
      icon={{ source: Icon.Box, tintColor: Color.Blue }}
      accessories={[pkg.importedBy ? { text: `${pkg.importedBy.toLocaleString()} imports`, icon: Icon.Download } : {}]}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open in Browser">
            <Action.OpenInBrowser title="View Package" url={getPackageURL(pkg.path)} icon={Icon.Book} />
            <Action.OpenInBrowser
              title="View Examples"
              url={getPackageExamplesURL(pkg.path)}
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action.OpenInBrowser
              title="View Documentation"
              url={getPackageDocsURL(pkg.path)}
              icon={Icon.Document}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Import Statement"
              content={`import "${pkg.path}"`}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Package Path"
              content={pkg.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Package URL"
              content={getPackageURL(pkg.path)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
