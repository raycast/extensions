import { List } from "@raycast/api";
import type { Package } from ".././types";

interface Props {
  searchResult: Package;
}

export const PackageDependencies = ({ searchResult }: Props): JSX.Element => {
  return (
    <List navigationTitle="Dependencies">
      <List.Section title={searchResult.name} subtitle={searchResult.platform}>
        {searchResult.versions.map(version => (
          <List.Item
            key={version.number}
            title={version.number}
            accessoryTitle={new Date(version.published_at).toLocaleDateString()}
          />
        )).reverse()}
      </List.Section>
    </List>
  );
};
