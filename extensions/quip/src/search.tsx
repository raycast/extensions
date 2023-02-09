import { Action, ActionPanel, Detail, Icon, List } from '@raycast/api';
import { useCachedState, useFetch } from '@raycast/utils';
import moment from 'moment';
import { useEffect, useState } from 'react';
import {
  getThreadContentEndpoint,
  GetThreadContentResponse,
  searchThreadEndpoint,
  SearchThreadResponse,
  Thread,
} from './api';
import { downloadBlob, formatThreadDetailMarkdown, preferences } from './utils';

function ThreadDetail(props: { id: string; link: string }): JSX.Element {
  const [markdown, setMarkdown] = useState<string>('');

  const { isLoading } = useFetch<GetThreadContentResponse>(getThreadContentEndpoint(props.id), {
    headers: {
      Authorization: `Bearer ${preferences.personalAccessToken}`,
    },
    onData(data) {
      if (!data || !data.html) {
        setMarkdown('');
        return;
      }

      const { markdown, blobs } = formatThreadDetailMarkdown(data.html);
      setMarkdown(markdown);

      for (const blob of blobs) {
        downloadBlob(blob).then((filePath) => {
          setMarkdown((prev) => prev.replace(blob, `<file://${filePath}>`));
        });
      }
    },
  });

  return (
    <Detail
      navigationTitle="Preview Quip Document"
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={props.link} />
          <Action.CopyToClipboard title="Copy Link to Clipboard" content={props.link} />
        </ActionPanel>
      }
    />
  );
}

export default function Command(): JSX.Element {
  const [searchText, setSearchText] = useState<string>('');
  const [threads, setThreads] = useCachedState<Thread[]>('searched-threads', []);
  const [canExecute, setCanExecute] = useState<boolean>(false);

  const { isLoading } = useFetch<SearchThreadResponse>(
    searchThreadEndpoint(searchText, !!preferences.onlyMatchTitles),
    {
      headers: {
        Authorization: `Bearer ${preferences.personalAccessToken}`,
      },
      onWillExecute: () => {
        setCanExecute(false);
      },
      onData: (data) => {
        if (!data || !Array.isArray(data) || data.length === 0) {
          setThreads([]);
          return;
        }

        setThreads(data.map((datum) => datum.thread));
      },
      execute: canExecute,
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (searchText !== '') {
      setCanExecute(true);
    }
  }, [searchText]);

  return (
    <List
      searchBarPlaceholder="Search Quip documents "
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading && searchText !== ''}
      throttle={true}
    >
      {threads.map((thread) => (
        <List.Item
          key={thread.id}
          id={thread.id}
          title={thread.title}
          accessories={[
            {
              text: moment(thread.updated_usec / 1000).fromNow(),
              tooltip: moment(thread.updated_usec / 1000).toLocaleString(),
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Preview Document"
                icon={Icon.Eye}
                target={<ThreadDetail id={thread.id} link={thread.link} />}
              />
              <Action.OpenInBrowser url={thread.link} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
