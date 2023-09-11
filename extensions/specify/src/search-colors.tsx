import { Action, ActionPanel, Icon, List } from '@raycast/api';
import { useEffect, useState } from 'react';
import { useAsync } from 'react-use';
import ColorListItem from './components/SearchColors/ColorListItem';
import RepositoryDropdown from './components/SearchColors/RepositoryDropdown';
import { useSpecifyHttpApi } from './hooks/useSpecifyHttpApi';
import { Color } from './types/tokens.types';
import { Repository } from './types/repositories.types';

export default function Command() {
  const [namespace, setNamespace] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isLoadingDisplay, setIsLoadingDisplay] = useState(true);

  const { getRepositories, getColors } = useSpecifyHttpApi();

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

  const { value: colors, loading: isLoadingColors } = useAsync(async () => {
    if (!selectedRepo) {
      return;
    }
    const result = await getColors(namespace, selectedRepo.name);
    return result;
  }, [selectedRepo]);

  useEffect(() => {
    if (!isLoadingColors && selectedRepo) {
      setIsLoadingDisplay(false);
    }
  }, [isLoadingColors]);

  return (
    <List
      isLoading={isLoadingDisplay}
      navigationTitle="Search Colors"
      searchBarPlaceholder="Search your colors"
      searchBarAccessory={
        <RepositoryDropdown repositories={repositories} onChange={handleChange} isLoading={isLoadingDisplay} />
      }
    >
      {!colors?.length ? (
        <List.EmptyView
          icon={{ source: Icon.Binoculars }}
          title={repositories?.length ? 'No colors found' : 'No repositories found'}
          description={`You don’t have any ${repositories?.length ? 'colors' : 'repositories'} yet. Why not add some?`}
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
        (colors || []).map(
          (color) =>
            selectedRepo && (
              <ColorListItem
                key={color.id}
                color={color as Color}
                repositoryName={selectedRepo.name}
                namespace={namespace}
              />
            )
        )
      )}
    </List>
  );
}
