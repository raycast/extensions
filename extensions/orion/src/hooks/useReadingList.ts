import { useEffect, useState } from "react";
import { parseFileSync } from "bplist-parser";

import { Bookmark, OrionReadingListItem, OrionReadingListPlistResult } from "../types";
import { getReadingListPath } from "src/utils";

const useReadingList = (selectedProfileId: string) => {
  const [readingList, setReadingList] = useState<Bookmark[]>();
  const readingListPath = getReadingListPath(selectedProfileId);

  useEffect(() => {
    const bookmarksPlist = parseFileSync(readingListPath) as OrionReadingListPlistResult;
    const items = bookmarksPlist[0];
    const readingList = parseReadingList(items);
    setReadingList(readingList);
  }, [selectedProfileId]);

  return { readingList };
};

function parseReadingList(items: OrionReadingListItem[]) {
  return items
    .filter((item) => !!item.url)
    .map((oBookmark) => {
      const bookmark: Bookmark = {
        uuid: oBookmark.id,
        title: oBookmark.title,
        url: oBookmark.url.relative,
        dateAdded: oBookmark.dateAdded,
        imageUrl: oBookmark.imageUrl?.relative,
        folders: [],
      };
      return bookmark;
    });
}

export default useReadingList;
