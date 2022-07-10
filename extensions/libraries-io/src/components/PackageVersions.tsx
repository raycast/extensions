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
      {searchResult.versions.map(version => (
        <List.Item
          title={version.number}
        />
      ))};
    </List>
  );
};
