import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { PackageDependencies } from "./PackageDependencies";
import type { Package } from ".././types";

interface Props {
  searchResult: Package;
}

export const PackageVersions = ({ searchResult }: Props): JSX.Element => {
  return (
    <List navigationTitle="Versions">
      <List.Section title={searchResult.name} subtitle={searchResult.platform}>
        {searchResult.versions.map(version => (
          <List.Item
            key={version.number}
            title={version.number}
            accessoryTitle={new Date(version.published_at).toLocaleDateString()}
            actions={
              <ActionPanel>
                <Action.Push title="Show Dependencies" icon={Icon.List} target={<PackageDependencies key={searchResult.name + searchResult.platform} searchResult={searchResult} />} />
              </ActionPanel>
            }
          />
        )).reverse()}
      </List.Section>
    </List>
  );
};
