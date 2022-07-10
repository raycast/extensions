import { List } from "@raycast/api";

interface Props {
  searchResult: SearchResult;
}

interface SearchResult {
  name: string;
  description?: string;
  platform: string;
  homepage: string;
  repositoryUrl: string;
  packageManagerUrl: string;
  versions: Array<Version>;
}

interface Version {
  number: string;
  published_at: string;
  spdx_expression: string;
  original_license: string;
  researched_at: string;
  repository_sources: string[];
}

export const PackageVersions = ({ searchResult }: Props): JSX.Element => {
  return (
    <List navigationTitle="Versions">
      <List.Section title={searchResult.name} subtitle={searchResult.platform}>
        {searchResult.versions.map(version => (
          <List.Item
            key={version.number}
            title={version.number}
            accessoryTitle={version.published_at}
          />
        )).reverse()}
      </List.Section>
    </List>
  );
};
