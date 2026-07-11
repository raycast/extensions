import { Action, ActionPanel, Icon, Grid } from '@raycast/api';
import { useEffect, useState } from 'react';
import { useAsync } from 'react-use';
import { useSpecifyHttpApi } from './hooks/useSpecifyHttpApi';
import { Vector } from './types/tokens.types';
import { Repository } from './types/repositories.types';
import RepositoryDropdown from './components/GridUtils/RepositoryDropdown';
import VectorGridItem from './components/SearchVectors/VectorGridItem';

export default function Command() {
  const [namespace, setNamespace] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [page, setPage] = useState(0);
  const [maxPage, setMaxPage] = useState(0);
  const [lastRecordedPage, setLastRecordedPage] = useState(0);
  const defaultVectorsPerPage = 40;
  const [vectorsPerPage, setVectorsPerPage] = useState(defaultVectorsPerPage);
  const [searchText, setSearchText] = useState('');
  const [vectorsToDisplay, setVectorsToDisplay] = useState<Vector[]>([]);
  const [isLoadingDisplay, setIsLoadingDisplay] = useState(true);

  const { getRepositories, getVectors } = useSpecifyHttpApi();

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

  const { value: vectors, loading: isLoadingVectors } = useAsync(async () => {
    if (!selectedRepo) {
      return;
    }
    const result = await getVectors(namespace, selectedRepo.name);
    return result;
  }, [selectedRepo]);

  useEffect(() => {
    if (!isLoadingVectors && selectedRepo) {
      setIsLoadingDisplay(false);
    }
  }, [isLoadingVectors]);

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);

    if (!vectors) {
      return;
    }

    // Go back to default with pagination
    if (!text.length) {
      setPage(lastRecordedPage);
      setVectorsPerPage(defaultVectorsPerPage);
      setMaxPage(Math.ceil(vectors.length / vectorsPerPage) - 1);
      setVectorsToDisplay(vectors.slice(page * vectorsPerPage, (page + 1) * vectorsPerPage));
      return;
    }

    // Search through all the vectors
    if (page > 0) {
      setLastRecordedPage(page);
    }
    setPage(0);
    setMaxPage(0);
    setVectorsPerPage(vectors.length);
    const filteredVectors = vectors.filter((vector) => vector.name.toLowerCase().includes(text.toLowerCase()));
    setVectorsToDisplay(filteredVectors);
  };

  const handleGoNextPage = () => {
    setPage(page + 1);
  };

  const handleGoPreviousPage = () => {
    setPage(page - 1);
  };

  const handleGoToFirstPage = () => {
    setPage(0);
  };

  useEffect(() => {
    if (!vectors?.length) {
      return;
    }

    setMaxPage(Math.ceil(vectors.length / vectorsPerPage) - 1);
  }, [vectors]);

  useEffect(() => {
    if (!vectors?.length) {
      return;
    }

    setVectorsToDisplay(vectors.slice(page * vectorsPerPage, (page + 1) * vectorsPerPage));
  }, [vectors, page, vectorsPerPage]);

  return (
    <Grid
      isLoading={isLoadingDisplay}
      itemSize={Grid.ItemSize.Medium}
      inset={Grid.Inset.Small}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      navigationTitle="Search Vectors"
      searchBarPlaceholder="Search your vectors"
      searchBarAccessory={
        <RepositoryDropdown repositories={repositories} onChange={handleChange} isLoading={isLoadingDisplay} />
      }
    >
      {!vectors?.length ? (
        <Grid.EmptyView
          icon={{ source: Icon.Binoculars }}
          title={repositories?.length ? 'No vectors found' : 'No repositories found'}
          description={`You don’t have any ${repositories?.length ? 'vectors' : 'repositories'} yet. Why not add some?`}
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
        (vectorsToDisplay || []).map(
          (vector) =>
            selectedRepo && (
              <VectorGridItem
                key={vector.id}
                vector={vector as Vector}
                repositoryName={selectedRepo.name}
                namespace={namespace}
                page={page}
                maxPage={maxPage}
                handleGoNextPage={handleGoNextPage}
                handleGoPreviousPage={handleGoPreviousPage}
                handleGoToFirstPage={handleGoToFirstPage}
              />
            )
        )
      )}
    </Grid>
  );
}
