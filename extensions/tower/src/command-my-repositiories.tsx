import { Detail, render } from "@raycast/api";
import BookmarkList from "./components/bookmark-list";
import { fetchBookmarks, isTowerCliInstalled, towerCliRequiredMessage } from "./utils";

async function main() {
  if (isTowerCliInstalled()) {
    const bookmarks = await fetchBookmarks();
    render(<BookmarkList bookmarks={bookmarks} />);
  } else {
    render(<Detail navigationTitle="Tower CLI not installed" markdown={towerCliRequiredMessage()}></Detail>);
  }
}

main();
