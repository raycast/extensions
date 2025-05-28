import { default as Fuse } from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { LinkdingBookmark } from "../types/linkding-types";
import useBookmarks from "./use-bookmarks";

const useFilteredBookmarks = () => {
  const { isLoading, bookmarks } = useBookmarks();

  const fuseRef = useRef(
    new Fuse<LinkdingBookmark>([], {
      keys: [
        { name: "title", weight: 2 },
        { name: "description", weight: 1 },
        { name: "tag_names", weight: 3 },
      ],
      threshold: 0.3,
    })
  );
  useEffect(() => {
    fuseRef.current.setCollection(bookmarks);
  }, [bookmarks]);

  const [filter, setFilter] = useState("");
  const filteredBookmarks = useMemo(() => {
    if (!filter) return bookmarks;
    return fuseRef.current.search(filter).map((r) => r.item);
  }, [filter, bookmarks]);

  return {
    isLoading,
    filteredBookmarks,
    setFilter,
  };
};

export default useFilteredBookmarks;
