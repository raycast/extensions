import React, { useState } from 'react';
import { Action, ActionPanel, Icon, List, showToast, Toast } from '@raycast/api';
import { useCachedState } from '@raycast/utils';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { withAuth } from './features/with-auth';
import { withQuery } from './features/with-query';
import {
  RecentMinutesListResponse as RecentList,
  SearchMinutesResponse as SearchResults,
  fetchRecentMinutesList,
  searchMinutes,
  removeRecentMinute,
} from './services/minutes';
import { StorageKey } from './utils/storage';
import { preference } from './utils/config';
import { timeFormat, timeSince } from './utils/time';
import { trimTagsAndDecodeEntities } from './utils/string';

const SearchMinutesView: React.FC = () => {
  const [cachedRecentList, setCachedRecentList] = useCachedState<RecentList | null>(StorageKey.MinutesRecentList, null);
  const [searchKeywords, setSearchKeywords] = useState('');
  const {
    isFetching,
    data: documentList,
    refetch,
  } = useQuery<SearchResults | RecentList | null>({
    queryKey: ['SearchMinutesView', searchKeywords],
    queryFn: ({ signal }) =>
      searchKeywords
        ? searchMinutes({ query: searchKeywords }, signal)
        : fetchRecentMinutesList(preference.recentListCount, signal).then((data) => {
            setCachedRecentList(data);
            return data;
          }),
    placeholderData: (previousData) => keepPreviousData(previousData) || cachedRecentList,
  });

  const handleRemoveRecent = async (objToken: string) => {
    showToast({ title: 'Removing', style: Toast.Style.Animated });
    const result = await removeRecentMinute(objToken);
    if (result) {
      showToast(Toast.Style.Success, 'Removed successfully');
      refetch();
    }
  };

  return (
    <List
      isLoading={isFetching}
      searchBarPlaceholder="Search minutes..."
      onSearchTextChange={setSearchKeywords}
      throttle
    >
      {documentList != null ? (
        isRecentList(documentList) ? (
          <RecentDocumentsView list={documentList} onRemove={handleRemoveRecent} />
        ) : (
          <SearchResultView list={documentList} />
        )
      ) : null}
    </List>
  );
};

const isRecentList = (list: RecentList | SearchResults): list is RecentList => {
  return 'list' in list;
};

const RecentDocumentsView: React.FC<{
  list: RecentList;
  onRemove?: (objToken: string) => void;
}> = ({ list, onRemove }) => {
  if (!list || !list.list) return null;
  return (
    <List.Section title="Recent Minutes" subtitle={`${list.list.length}`}>
      {list.list.map((minuteItem) => {
        return (
          <MinuteItem
            key={minuteItem.url}
            {...minuteItem}
            actions={
              <Action
                icon={Icon.Trash}
                title="Remove From Recent Minutes"
                shortcut={{ key: 'x', modifiers: ['ctrl'] }}
                onAction={() => onRemove?.(minuteItem.object_token)}
              />
            }
          />
        );
      })}
    </List.Section>
  );
};

const SearchResultView: React.FC<{ list: SearchResults }> = ({ list }) => {
  if (!list || !list.meetings) return null;
  return (
    <List.Section title="Search Results" subtitle={`${list.meetings.length}`}>
      {list.meetings.map((meetingItem) => {
        return <MinuteItem key={meetingItem.url} {...meetingItem} />;
      })}
    </List.Section>
  );
};

function MinuteItem({
  topic,
  url,
  start_time,
  owner_name,
  actions,
}: {
  topic: string;
  url: string;
  start_time: number;
  owner_name?: string;
  actions?: React.ReactElement;
}) {
  const time = {
    short: timeSince(start_time, true),
    full: `Time: ${timeFormat(start_time, true)}`,
  };
  const trimmedTopic = trimTagsAndDecodeEntities(topic || 'Untitled');
  return (
    <List.Item
      id={url}
      title={trimmedTopic}
      subtitle={owner_name}
      accessories={[{ text: time.short, tooltip: time.full }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard title="Copy URL" content={url} />
          {actions}
        </ActionPanel>
      }
    />
  );
}

export default withAuth(withQuery(SearchMinutesView));
