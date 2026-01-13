import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useState } from "react";
import { getStandardLibrary, getPackageURL, getPackageExamplesURL, getPackageDocsURL, GoPackage } from "./api/pkggo";

export default function BrowseStandardLibrary() {
  const [searchText, setSearchText] = useState("");
  const standardLibrary = getStandardLibrary();

  // Filter packages based on search text
  const filteredLibrary = Object.entries(standardLibrary).reduce(
    (acc, [category, packages]) => {
      if (searchText.length === 0) {
        acc[category] = packages;
      } else {
        const filtered = packages.filter(
          (pkg) =>
            pkg.path.toLowerCase().includes(searchText.toLowerCase()) ||
            pkg.synopsis.toLowerCase().includes(searchText.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[category] = filtered;
        }
      }
      return acc;
    },
    {} as { [category: string]: GoPackage[] }
  );

  const hasResults = Object.keys(filteredLibrary).length > 0;

  return (
    <List
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter packages... (e.g., http, json, sync)"
      throttle
    >
      {!hasResults ? (
        <List.EmptyView
          icon={{ source: Icon.QuestionMark, tintColor: Color.Orange }}
          title="No packages found"
          description={`No packages found for "${searchText}". Try a different search term.`}
        />
      ) : (
        Object.entries(filteredLibrary).map(([category, packages]) => (
          <List.Section key={category} title={category} subtitle={`${packages.length} packages`}>
            {packages.map((pkg) => (
              <PackageListItem key={pkg.path} pkg={pkg} category={category} />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

function PackageListItem({ pkg, category }: { pkg: GoPackage; category: string }) {
  const categoryColors: { [key: string]: Color } = {
    "Web & HTTP": Color.Blue,
    Networking: Color.Purple,
    Cryptography: Color.Red,
    "Data Encoding": Color.Green,
    "File & I/O": Color.Orange,
    "Data Structures": Color.Yellow,
    "Text Processing": Color.Magenta,
    Concurrency: Color.Blue,
    "Time & Date": Color.Purple,
    Testing: Color.Green,
    Math: Color.Orange,
    Database: Color.Red,
    "Reflection & Runtime": Color.Magenta,
    "Error Handling": Color.Yellow,
  };

  return (
    <List.Item
      title={pkg.path}
      subtitle={pkg.synopsis}
      icon={{ source: Icon.Box, tintColor: categoryColors[category] || Color.Blue }}
      accessories={[{ tag: { value: category, color: categoryColors[category] || Color.Blue } }]}
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
              icon={Icon.Clipboard}
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
          <ActionPanel.Section title="Learn More">
            <Action.OpenInBrowser
              title="Go Documentation"
              url="https://go.dev/doc/"
              icon={Icon.Book}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
            <Action.OpenInBrowser
              title="Go by Example"
              url="https://gobyexample.com/"
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
