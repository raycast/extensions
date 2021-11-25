import { List, ActionPanel, CopyToClipboardAction, OpenInBrowserAction, Detail } from '@raycast/api';
import { useState, useEffect, useCallback } from 'react';
import os from 'os';
import _ from 'lodash';
import plist from 'simple-plist';
import { promisify } from 'util';
import { getUrlDomain, getFaviconUrl, plural, formatDate, permissionErrorMarkdown, search } from './shared';

const readPlist = promisify(plist.readFile);

const safariBookmarksPlistPath = `${os.homedir()}/Library/Safari/Bookmarks.plist`;

interface BookmarkPListResult {
  Title: string;
  Children: [
    {
      Title: string;
      Children: Bookmark[];
    }
  ];
}

interface Bookmark {
  URIDictionary: {
    title: string;
  };
  ReadingListNonSync: {
    Title: string;
  };
  WebBookmarkUUID: string;
  URLString: string;
  ReadingList: {
    DateAdded: string;
    DateLastViewed?: string;
    PreviewText: string;
  };
  imageURL: string;
}

interface ReadingListBookmark {
  uuid: string;
  url: string;
  domain: string;
  title: string;
  dateAdded: string;
  dateLastViewed?: string;
  description: string;
}

const extractReadingListBookmarks = (bookmarks: BookmarkPListResult): ReadingListBookmark[] =>
  _.chain(bookmarks.Children)
    .find(['Title', 'com.apple.ReadingList'])
    .thru((res) => res.Children)
    .map((res) => ({
      uuid: res.WebBookmarkUUID,
      url: res.URLString,
      domain: getUrlDomain(res.URLString),
      title: res.ReadingListNonSync.Title || res.URIDictionary.title,
      dateAdded: res.ReadingList.DateAdded,
      dateLastViewed: res.ReadingList.DateLastViewed,
      description: res.ReadingList.PreviewText || '',
    }))
    .orderBy('dateAdded', 'desc')
    .value();

function ListItem(props: { bookmark: ReadingListBookmark }) {
  const { bookmark } = props;
  return (
    <List.Item
      title={bookmark.title}
      subtitle={bookmark.domain}
      icon={getFaviconUrl(bookmark.domain)}
      accessoryTitle={formatDate(bookmark.dateAdded)}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={bookmark.url} />
          <CopyToClipboardAction content={bookmark.url} title="Copy URL" />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [bookmarks, setBookmarks] = useState<ReadingListBookmark[]>();
  const [searchText, setSearchText] = useState<string>('');

  const fetchItems = useCallback(async () => {
    try {
      const safariBookmarksPlist = (await readPlist(safariBookmarksPlistPath)) as BookmarkPListResult;
      const bookmarks = extractReadingListBookmarks(safariBookmarksPlist);
      setBookmarks(bookmarks);
    } catch (err) {
      if (err instanceof Error && err.message.includes('operation not permitted')) {
        return setHasPermissionError(true);
      }

      throw err;
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (hasPermissionError) {
    return <Detail markdown={permissionErrorMarkdown} />;
  }

  const groupedBookmarks = _.groupBy(bookmarks, ({ dateLastViewed }) => (dateLastViewed ? 'read' : 'unread'));

  return (
    <List isLoading={!bookmarks} onSearchTextChange={setSearchText}>
      {_.map(groupedBookmarks, (bookmarks, key) => {
        const filteredBookmarks = search(
          bookmarks,
          ['title', 'url', 'description'],
          searchText
        ) as ReadingListBookmark[];

        return (
          <List.Section key={key} title={_.startCase(key)} subtitle={plural(filteredBookmarks.length, 'bookmark')}>
            {filteredBookmarks.map((bookmark) => (
              <ListItem key={bookmark.uuid} bookmark={bookmark} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
