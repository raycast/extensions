import { List } from "@raycast/api";
import BookmarkListItem from "./components/BookmarkListItem";
import useProfiles, { useSelectedProfileId } from "./hooks/useProfiles";
import ProfileDropdown from "./components/ProfileDropdown";
import useReadingList from "./hooks/useReadingList";

export default function Command() {
  const { profiles } = useProfiles();
  const { selectedProfileId, setSelectedProfileId } = useSelectedProfileId("Defaults");
  const { readingList } = useReadingList(selectedProfileId);

  return (
    <List
      isLoading={!readingList || !profiles}
      searchBarPlaceholder="Search by title, domain name"
      searchBarAccessory={
        <ProfileDropdown
          profiles={profiles}
          selectedProfileId={selectedProfileId}
          onProfileSelected={setSelectedProfileId}
        />
      }
    >
      {readingList?.map((bookmark) => <BookmarkListItem key={bookmark.uuid} bookmark={bookmark} />)}
    </List>
  );
}
