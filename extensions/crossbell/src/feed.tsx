import { Action, ActionPanel, List, openExtensionPreferences } from "@raycast/api";
import { useCharacterByHandle, useFeed } from "./apis";
import NoteListItem from "./components/NoteListItem";
import { getPreference } from "./utils/preference";

export default function Command() {
  const { characterHandle } = getPreference();

  const { data: character, isLoading: isLoadingCharacter } = useCharacterByHandle(characterHandle);
  const { data: feeds, isLoading: isLoadingFeed } = useFeed(character?.characterId);

  if (!isLoadingCharacter && !character) {
    return (
      <List>
        <List.EmptyView
          icon="no-view.png"
          title="Character not found"
          description="Did you configure the extension with your correct handle?"
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoadingCharacter || isLoadingFeed}>
      {feeds?.list.map(
        (feed) => feed.note && <NoteListItem key={`${feed.transactionHash}-${feed.logIndex}`} note={feed.note} />,
      )}
    </List>
  );
}
