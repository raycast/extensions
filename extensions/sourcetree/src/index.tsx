import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { PlistMissingError, Repository, RepositoryList } from "./lib/repository";
import { Preferences } from "./lib/preferences";
import { EmptyRepositoryList } from "./EmptyRepositoryList";
import { SectionedRepositoryList } from "./SectionedRepositoryList";

const repo = new RepositoryList(Preferences.get().plist);

export default function Command(): JSX.Element {
  const { isLoading, data, error } = useCachedPromise(getRepositoryList, [], {
    keepPreviousData: true,
    execute: true,
  });

  if (error instanceof PlistMissingError) {
    return <EmptyRepositoryList />;
  }

  return (
    <List isLoading={isLoading}>
      <SectionedRepositoryList repositories={data} />
    </List>
  );
}

function getRepositoryList(): Promise<Repository[]> {
  return repo.getRepositories();
}
