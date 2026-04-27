import { List, Action, ActionPanel, Detail, showToast, Toast, openExtensionPreferences, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useDecks } from "../hooks/useDecks";
import { useDictionarySearch } from "../hooks/useDictionarySearch";
import { useUserCardIds } from "../hooks/useUserCardIds";
import { isProUser } from "../lib/pro-gate";
import { addCardToDeck } from "../lib/card";
import { submitRequestCard } from "../lib/request-card";
import { pronounceWord } from "../lib/audio";
import { EntryDetail } from "./EntryDetail";
import type { DictionaryEntry } from "../types";

/**
 * Shared root component for all commands.
 * Uses a single persistent List to prevent Raycast from resetting the search bar.
 */
export function CommandRoot({ initialSearchText }: { initialSearchText?: string }) {
  const [searchText, setSearchText] = useState(initialSearchText ?? "");
  const { user, isLoading: isAuthLoading, error: authError, email } = useAuth();

  const { data: hasPro, isLoading: isProLoading } = useCachedPromise(() => isProUser(user?.id ?? ""), [], {
    execute: !!user,
  });

  const { decks, isLoading: isDecksLoading } = useDecks(user?.id ?? null);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id ?? "");

  const { userCardIds, revalidate: revalidateUserCards } = useUserCardIds(user?.id ?? null);

  const isAuthenticated = !!user && hasPro === true;
  const {
    results,
    isLoading: isSearching,
    error: searchError,
  } = useDictionarySearch(isAuthenticated ? searchText : "");

  useEffect(() => {
    if (initialSearchText) {
      setSearchText(initialSearchText);
    }
  }, [initialSearchText]);

  // Auth error — show outside the single List
  if (authError) {
    return (
      <List>
        <List.EmptyView
          title="Authentication Failed"
          description={authError.message || "Check your Joey credentials in extension preferences."}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Pro gate — show outside the single List
  if (user && hasPro === false) {
    return (
      <Detail
        markdown={`# Joey Pro Required\n\nThe Raycast extension requires a Joey Pro subscription.\n\nUpgrade to Pro in the Joey app to use this extension.`}
      />
    );
  }

  const isLoading = isAuthLoading || isProLoading || isDecksLoading || isSearching;
  const hasResults = !!results?.length;

  async function handleAddCard(entry: DictionaryEntry) {
    if (!selectedDeckId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No deck selected",
      });
      return;
    }

    if (userCardIds.has(entry.id)) {
      await showToast({
        style: Toast.Style.Success,
        title: "Already in deck",
        message: `"${entry.word}" is already in your deck`,
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding card...",
    });

    const result = await addCardToDeck(user!.id, entry, selectedDeckId);

    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Card added";
      toast.message = entry.word;
      revalidateUserCards();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to add card";
      toast.message = result.error;
    }
  }

  async function handleRequestCard(word: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Requesting card...",
    });

    const result = await submitRequestCard({
      word,
      context: "raycast-search",
      source: "search",
      user: email,
    });

    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Card requested";
      toast.message = `"${word}" has been submitted`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to request card";
      toast.message = result.error;
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={hasResults}
      searchText={searchText}
      searchBarPlaceholder="Search for a word..."
      onSearchTextChange={setSearchText}
      throttle={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Deck" storeValue={true} onChange={setSelectedDeckId}>
          {decks.map((deck) => (
            <List.Dropdown.Item key={deck.id} title={deck.name} value={deck.id} />
          ))}
        </List.Dropdown>
      }
    >
      {searchText.length === 0 ? (
        <List.EmptyView title="Type a word to search" icon={Icon.MagnifyingGlass} />
      ) : isSearching && !results ? (
        <List.EmptyView title="Searching..." icon={Icon.MagnifyingGlass} />
      ) : searchError ? (
        <List.EmptyView title="Search Failed" description={searchError.message} icon={Icon.ExclamationMark} />
      ) : results && results.length === 0 ? (
        <List.EmptyView
          title={`No results for "${searchText}"`}
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action title="Request Card" icon={Icon.PlusCircle} onAction={() => handleRequestCard(searchText)} />
            </ActionPanel>
          }
        />
      ) : (
        (results || []).map((entry) => {
          const isAlreadyInDeck = userCardIds.has(entry.id);

          return (
            <List.Item
              key={entry.id}
              title={entry.word}
              subtitle={entry.definition}
              accessories={isAlreadyInDeck ? [{ icon: Icon.CheckCircle, tooltip: "Already in deck" }] : []}
              detail={<EntryDetail entry={entry} isLoading={isSearching} />}
              actions={
                <ActionPanel>
                  <Action
                    title="Pronounce"
                    icon={Icon.SpeakerHigh}
                    onAction={() => pronounceWord(entry.word_audio_path, entry.word)}
                  />
                  <Action
                    title="Add to Deck"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => handleAddCard(entry)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
