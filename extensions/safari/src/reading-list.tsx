import { List, ActionPanel, Icon, OpenAction, Detail } from '@raycast/api';
import { useState, useEffect, useCallback } from 'react';
import os from 'os';
import _ from 'lodash';
import plist from 'simple-plist';
import { promisify } from 'util';
import { getUrlDomain, getFaviconUrl, plural, formatDate, permissionErrorMarkdown } from './shared';

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
      description: res.ReadingList.PreviewText || '',
    }))
    .orderBy('dateAdded', 'desc')
    .value();

export default function Command() {
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [bookmarks, setBookmarks] = useState<ReadingListBookmark[]>();

  const fetchItems = useCallback(async () => {
    try {
      const safariBookmarksPlist = (await readPlist(safariBookmarksPlistPath)) as BookmarkPListResult;
      const bookmarks = extractReadingListBookmarks(safariBookmarksPlist);
      setBookmarks(bookmarks);
    } catch (err) {
      // TODO check error
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

  return (
    <List
      isLoading={!bookmarks}
      navigationTitle={bookmarks && `Reading List (${plural(bookmarks.length, 'bookmark')})`}
    >
      {_.map(bookmarks, (bookmark: ReadingListBookmark) => (
        <List.Item
          key={bookmark.uuid}
          title={bookmark.title}
          subtitle={bookmark.domain}
          keywords={[bookmark.url, bookmark.domain, bookmark.description]}
          icon={getFaviconUrl(bookmark.domain)}
          accessoryTitle={formatDate(bookmark.dateAdded)}
          actions={
            <ActionPanel>
              <OpenAction title="Open in Safari" target={bookmark.url} application="Safari" icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
