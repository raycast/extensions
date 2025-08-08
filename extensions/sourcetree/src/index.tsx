import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { PlistMissingError, Repository, RepositoryList } from "./lib/repository";
import { Preferences } from "./lib/preferences";
import { EmptyRepositoryList } from "./EmptyRepositoryList";
import { SectionedRepositoryList } from "./SectionedRepositoryList";
import { BinNotAvailable } from "./BinNotAvailable";

const pref = Preferences.get();
const repo = new RepositoryList(pref.plist);

export default function Command() {
  const { isLoading, data, error } = useCachedPromise(getRepositoryList, [], {
    keepPreviousData: true,
    execute: true,
  });

  if (error instanceof PlistMissingError) {
    return <EmptyRepositoryList />;
  }

  if (!pref.isBinAvailable()) {
    return <BinNotAvailable bin={pref.bin} />;
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
