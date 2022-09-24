import { Action, ActionPanel, Detail, List, openExtensionPreferences } from "@raycast/api";
import { useCharacterByHandle, useFeed, useSearch } from "./apis";
import NoteListItem from "./components/NoteListItem";
import { getPreference } from "./utils/preference";

export default function Command() {
  const { characterHandle } = getPreference();

  const { data: character, isLoading: isLoadingCharacter } = useCharacterByHandle(characterHandle);
  const { data: feeds, isLoading: isLoadingFeed } = useFeed(character?.characterId);

  if (!characterHandle) {
    return (
      <Detail
        markdown={`Your character handle is required. Please (press Enter to) update it in extension preferences and try again.`}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (!isLoadingCharacter && !character) {
    return (
      <Detail
        markdown={`Character not found. Did you configure the extension with your correct handle?`}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoadingCharacter || isLoadingFeed}>
      {feeds?.list.map((feed) => (
        <NoteListItem key={`${feed.transactionHash}-${feed.logIndex}`} note={feed.note!} />
      ))}
    </List>
  );
}
