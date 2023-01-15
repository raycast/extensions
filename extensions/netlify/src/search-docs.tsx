import {
  ActionPanel,
  Action,
  Color,
  Icon,
  List,
  LocalStorage,
} from '@raycast/api';
import { useEffect, useState } from 'react';

import api from './utils/api';
import { handleNetworkError } from './utils/helpers';
import { AlgoliaHit } from './utils/interfaces';

const NAMESPACE = 'docs.bookmark.v1.';
const prefix = (objectID: string) => `${NAMESPACE}${objectID}`;
const getTitle = (hit: AlgoliaHit) => {
  const { lvl1, lvl2, lvl3, lvl4 } = hit.hierarchy;
  return lvl4 || lvl3 || lvl2 || lvl1;
};

export default function Command() {
  const [isLoading, setLoading] = useState<boolean>(false);

  const [query, setQuery] = useState<string>('');
  const [hits, setHits] = useState<AlgoliaHit[]>([]);
  const [bookmarks, setBookmarks] = useState<AlgoliaHit[]>([]);

  async function getBookmarks() {
    const bookmarkedItems = await LocalStorage.allItems<
      Record<string, string>
    >();
    const bookmarkedHits: AlgoliaHit[] = Object.values(bookmarkedItems).map(
      (value) => JSON.parse(value),
    );
    setBookmarks(bookmarkedHits);
  }

  useEffect(() => {
    getBookmarks();
  }, []);

  useEffect(() => {
    async function fetchHits() {
      setLoading(true);
      try {
        const hits = await api.searchDocs(query);
        setHits(hits);
        setLoading(false);
      } catch (e) {
        setLoading(false);
        handleNetworkError(e);
      }
    }

    if (query) {
      fetchHits();
    }
  }, [query]);

  const sections = hits.reduce(
    (acc: Record<string, AlgoliaHit[]>, cur: AlgoliaHit) => {
      const section = cur.hierarchy.lvl1;
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(cur);
      return acc;
    },
    {},
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search docs.netlify.com..."
      searchText={query}
      throttle
    >
      {!query && bookmarks.length === 0 && (
        <List.EmptyView
          title="Search Netlify Documentation"
          description="Begin typing to search docs.netlify.com"
        />
      )}
      {!query && bookmarks.length > 0 && (
        <List.Section title="Bookmarks">
          {bookmarks
            .sort((a, b) =>
              getTitle(a).toLowerCase() > getTitle(b).toLowerCase() ? 1 : -1,
            )
            .map((bookmark) => (
              <DocListItem
                key={bookmark.objectID}
                bookmarks={bookmarks}
                hit={bookmark}
                getBookmarks={getBookmarks}
              />
            ))}
        </List.Section>
      )}
      {query &&
        Object.keys(sections).map((section) => (
          <List.Section key={section} title={section}>
            {sections[section]
              .filter((hit) => hit.hierarchy.lvl0 === 'In the docs')
              .map((hit) => (
                <DocListItem
                  key={hit.objectID}
                  bookmarks={bookmarks}
                  hit={hit}
                  getBookmarks={getBookmarks}
                />
              ))}
          </List.Section>
        ))}
    </List>
  );
}

interface DocListItemProps {
  bookmarks: AlgoliaHit[];
  hit: AlgoliaHit;
  getBookmarks: () => void;
}

function DocListItem(props: DocListItemProps) {
  const { bookmarks, hit, getBookmarks } = props;
  const title = getTitle(hit);
  const { lvl1, lvl2, lvl3, lvl4 } = hit.hierarchy;
  const levels = [lvl2, lvl3, lvl4].filter((b) => !!b);
  const breadcrumbs = levels.slice(0, levels.length - 1).join(' > ');
  const subtitle = breadcrumbs || hit.content || (title !== lvl1 ? lvl1 : '');
  const isBookmarked = bookmarks
    .map((b) => prefix(b.objectID))
    .includes(prefix(hit.objectID));

  async function addBookmark(hit: AlgoliaHit) {
    const { content, hierarchy, objectID, url } = hit;
    const value = JSON.stringify({ content, hierarchy, objectID, url });
    await LocalStorage.setItem(prefix(objectID), value);
    getBookmarks();
  }

  async function removeBookmark(objectID: string) {
    await LocalStorage.removeItem(prefix(objectID));
    getBookmarks();
  }

  return (
    <List.Item
      key={hit.objectID}
      icon={title === lvl1 ? Icon.Book : Icon.Document}
      title={title.replace(/[\s]{2,}/g, ' ')}
      subtitle={subtitle.replace(/[\s]{2,}/g, ' ')}
      accessories={
        [
          isBookmarked && {
            icon: { source: Icon.Bookmark, tintColor: Color.Red },
            tooltip: 'Bookmarked (⌘B)',
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ].filter(Boolean) as any[]
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Docs" url={hit.url} />
          </ActionPanel.Section>
          <Action
            icon={Icon.Bookmark}
            shortcut={{ key: 'b', modifiers: ['cmd'] }}
            title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
            onAction={() =>
              isBookmarked ? removeBookmark(hit.objectID) : addBookmark(hit)
            }
          />
        </ActionPanel>
      }
    />
  );
}
