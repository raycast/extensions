import { getPreferenceValues, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useSearchBookmarks, Bookmark } from "./api";
import { BookmarkListItem } from "./components";

export default function Command() {
  const { isLoading, data } = useSearchBookmarks();
  const [searchText, setSearchText] = useState("");
  const [filteredBookmarks, setFilteredBookmarks] = useState(data?.bookmarks);

  useEffect(() => {
    if (data) {
      setFilteredBookmarks(filterByTagsWithConstant(data.bookmarks, searchText));
    }
  }, [searchText, data]);

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search by tags..." throttle>
      {filteredBookmarks &&
        filteredBookmarks.map((bookmark) => <BookmarkListItem key={bookmark.id} bookmark={bookmark} />)}
    </List>
  );
}

function filterByTagsWithConstant(bookmarks: Bookmark[], searchTerm: string) {
  const { constantTags } = getPreferenceValues();
  const searchTags = searchTerm.split(" ");
  const searchTagsWithConstant = [...searchTags, constantTags]
  // Filter out empty tags, which happens when there are no constant tags
  .filter(tag => !!tag);
  return bookmarks.filter((bookmark) => {
    const bookmarkTags = bookmark.tags?.split(" ");
    return searchTagsWithConstant.every((searchTag) => {
      return bookmarkTags?.some((bookmarkTag) => {
        return bookmarkTag.includes(searchTag);
      });
    });
  });
}
