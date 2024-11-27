import { Action, ActionPanel, Icon, Grid } from '@raycast/api';
import { useEffect, useState } from 'react';
import { useAsync } from 'react-use';
import { useSpecifyHttpApi } from './hooks/useSpecifyHttpApi';
import { Bitmap } from './types/tokens.types';
import { Repository } from './types/repositories.types';
import BitmapGridItem from './components/SearchBitmaps/BitmapGridItem';
import RepositoryDropdown from './components/GridUtils/RepositoryDropdown';

export default function Command() {
  const [namespace, setNamespace] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isLoadingDisplay, setIsLoadingDisplay] = useState(true);

  const { getRepositories, getBitmaps } = useSpecifyHttpApi();

  const { value: repositories, loading: isLoadingRepositories } = useAsync(async () => {
    const result = await getRepositories();
    return result;
  }, []);

  useEffect(() => {
    if (!repositories) {
      // There is no repositories to display.
      if (!isLoadingRepositories) {
        setIsLoadingDisplay(false);
      }

      return;
    }

    const maybeRepoWithNamespace = repositories.find(
      (repo) => repo.organizationOwner?.namespace !== null && repo.organizationOwner?.namespace.length
    );

    if (
      !maybeRepoWithNamespace ||
      !maybeRepoWithNamespace.organizationOwner?.namespace ||
      !maybeRepoWithNamespace.organizationOwner?.namespace.length
    ) {
      return;
    }

    setNamespace(maybeRepoWithNamespace.organizationOwner?.namespace);
    setSelectedRepo(repositories[0]);
  }, [repositories]);

  const handleChange = (repo: Repository) => {
    setIsLoadingDisplay(true);
    setSelectedRepo(repo);
  };

  const { value: bitmaps, loading: isLoadingBitmaps } = useAsync(async () => {
    if (!selectedRepo) {
      return;
    }
    const result = await getBitmaps(namespace, selectedRepo.name);
    return result;
  }, [selectedRepo]);

  useEffect(() => {
    if (!isLoadingBitmaps && selectedRepo) {
      setIsLoadingDisplay(false);
    }
  }, [isLoadingBitmaps]);

  return (
    <Grid
      isLoading={isLoadingDisplay}
      itemSize={Grid.ItemSize.Medium}
      inset={Grid.Inset.Small}
      navigationTitle="Search Bitmaps"
      searchBarPlaceholder="Search your bitmaps"
      searchBarAccessory={
        <RepositoryDropdown repositories={repositories} onChange={handleChange} isLoading={isLoadingDisplay} />
      }
    >
      {!bitmaps?.length ? (
        <Grid.EmptyView
          icon={{ source: Icon.Binoculars }}
          title={repositories?.length ? 'No bitmaps found' : 'No repositories found'}
          description={`You don’t have any ${repositories?.length ? 'bitmaps' : 'repositories'} yet. Why not add some?`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Go to Repository"
                url={
                  repositories?.length
                    ? `https://specifyapp.com/${namespace}/${selectedRepo?.name}`
                    : 'https://specifyapp.com/'
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        (bitmaps || []).map(
          (bitmap) =>
            selectedRepo && (
              <BitmapGridItem
                key={bitmap.id}
                bitmap={bitmap as Bitmap}
                repositoryName={selectedRepo.name}
                namespace={namespace}
              />
            )
        )
      )}
    </Grid>
  );
}
