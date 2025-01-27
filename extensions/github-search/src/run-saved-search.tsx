import { List, ActionPanel, Action } from '@raycast/api';
import { useLocalStorage } from '@raycast/utils';
import type { ReusableFilter, SavedSearch } from './types';
import { useFrecencySorting } from '@raycast/utils';
import { buildUrl } from './search';
import { launchCommand, LaunchType } from '@raycast/api';

export default function SavedSearches() {
  const { value: savedSearches = [] } = useLocalStorage<SavedSearch[]>('saved-searches', []);
  const { value: reusableFilters = [] } = useLocalStorage<ReusableFilter[]>('repo-filters', []);
  const { data: sortedSearches, visitItem } = useFrecencySorting(savedSearches);

  return (
    <List>
      {sortedSearches.length === 0 ? (
        <List.EmptyView
          title="No Saved Searches"
          description="Create your first saved search in the main GitHub Search view"
          actions={
            <ActionPanel>
              <Action title="Open GitHub Search" onAction={() => launchCommand({ name: 'search', type: LaunchType.UserInitiated })} />
            </ActionPanel>
          }
        />
      ) : (
        sortedSearches.map(search => (
          <List.Item
            key={search.id}
            title={search.name}
            subtitle={search.query}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={buildUrl(search, reusableFilters)} onOpen={() => visitItem(search)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
