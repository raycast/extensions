import { List } from "@raycast/api";
import useBookmarks from "./hooks/useBookmarks";
import BookmarkListItem from "./components/BookmarkListItem";
import useProfiles, { useSelectedProfileId } from "./hooks/useProfiles";
import ProfileDropdown from "./components/ProfileDropdown";

export default function Command() {
  const { profiles } = useProfiles();
  const { selectedProfileId, setSelectedProfileId } = useSelectedProfileId("Defaults");
  const { bookmarks, isLoading } = useBookmarks(selectedProfileId);

  return (
    <List
      isLoading={isLoading || !profiles}
      searchBarPlaceholder="Search by title, domain name, or folder"
      searchBarAccessory={
        <ProfileDropdown
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onProfileSelected={setSelectedProfileId}
        />
      }
    >
      {bookmarks.map((bookmark) => (
        <BookmarkListItem key={bookmark.uuid} bookmark={bookmark} />
      ))}
    </List>
  );
}
