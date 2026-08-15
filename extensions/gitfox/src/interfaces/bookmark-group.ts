import Bookmark from "../dtos/bookmark-dto";

export interface BookmarkGroup {
  name: string;
  id: string;
  bookmarks: Bookmark[];
}
