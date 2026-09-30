import { ActionPanel, Action, Icon, List } from "@raycast/api";
import type { Package } from ".././types";
import { PackageDependencies } from "./PackageDependencies";
import { PackageVersions } from "./PackageVersions";

export const PackageResult = ({ searchResult }: { searchResult: Package }) => {
  return (
    <List.Item
      title={searchResult.name}
      icon={`package_manager_icons/${searchResult.platform.toLowerCase()}.png`}
      subtitle={searchResult.description}
      accessoryTitle={searchResult.platform}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Links">
            <Action.OpenInBrowser
              title="Open Libraries.io Page"
              url={`https://libraries.io/${searchResult.platform.toLowerCase()}/${encodeURIComponent(
                searchResult.name
              )}`}
              icon={`libraries-io-icon.png`}
            />
            <Action.OpenInBrowser title="Open Homepage" url={searchResult.homepage} icon={Icon.House} />
            <Action.OpenInBrowser
              title="Open Repository"
              url={searchResult.repository_url}
              icon={Icon.Book}
              shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
            />
            <Action.OpenInBrowser
              title="Open Package Manager Page"
              url={searchResult.package_manager_url}
              icon={`package_manager_icons/${searchResult.platform.toLowerCase()}.png`}
              shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Info">
            <Action.Push
              title="Show Dependencies"
              icon={Icon.Box}
              target={
                <PackageDependencies key={searchResult.name + searchResult.platform} searchResult={searchResult} />
              }
              shortcut={{ modifiers: ["cmd", "opt"], key: "e" }}
            />
            <Action.Push
              title="Show Versions"
              icon={Icon.Tag}
              target={<PackageVersions key={searchResult.name + searchResult.platform} searchResult={searchResult} />}
              shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Actions">
            <Action.OpenInBrowser
              title="Download Latest Release"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "opt"], key: "l" }}
              url={searchResult.latest_download_url}
            />
            <Action.CopyToClipboard
              content={searchResult.name}
              shortcut={{ modifiers: ["cmd"], key: "." }}
              title="Copy Package Name"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
