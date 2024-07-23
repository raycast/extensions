import AddCardAction from './actions/AddCardAction';
import BrowseCards from './browseCards';
import CreateDeckAction from './actions/CreateDeckAction';
import deckActions from './api/deckActions';
import miscellaneousActions from './api/miscellaneousActions';
import { Action, ActionPanel, confirmAlert, List, showToast, Toast } from '@raycast/api';
import { AnkiError } from './error/AnkiError';
import { ShortcutDictionary } from './types';
import { StudyDeck } from './actions/StudyDeck';
import { delay, getDeckState } from './util';
import { useCachedPromise } from '@raycast/utils';
import { useCallback, useEffect, useMemo } from 'react';

export default function Decks() {
  const { data, isLoading, revalidate, error } = useCachedPromise(deckActions.getDecks);

  const shortcuts = useMemo((): ShortcutDictionary => {
    return {
      addCardToDeck: { modifiers: ['ctrl'], key: 'a' },
      createNewDeck: { modifiers: ['cmd'], key: 'n' },
      deleteDeck: { modifiers: ['cmd'], key: 'd' },
      renameDeck: { modifiers: ['cmd'], key: 'r' },
      sync: { modifiers: ['cmd'], key: 's' },
    };
  }, []);

  const handleDeleteDeck = async (deckName: string) => {
    const deleteConfirm = await confirmAlert({
      title: `Are you sure you want to delete deck: ${deckName}?`,
    });

    if (deleteConfirm) {
      try {
        await deckActions.deleteDeck(deckName);
        await delay(1);
        revalidate();
      } catch (error: unknown) {
        if (error instanceof Error) {
          showToast({ title: 'Error', message: error.message });
        } else {
          showToast({ title: 'Error', message: 'An unknown error occurred' });
        }
      }
    }
  };

  const handleSync = useCallback(async () => {
    try {
      await miscellaneousActions.sync();

      showToast({
        title: 'Collection sync complete',
        style: Toast.Style.Success,
      });
    } catch (error: unknown) {
      if (error instanceof AnkiError) {
        showToast({ title: 'Anki Error', message: error.message, style: Toast.Style.Failure });
      } else {
        showToast({
          title: 'Error',
          message: 'There was an error performing this action',
          style: Toast.Style.Failure,
        });
      }
    }
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        title: error.message,
      });
    }
  }, [error]);

  const handleUpdateCache = useCallback(() => revalidate(), []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Decks"
      searchBarPlaceholder="Enter deck name..."
    >
      <List.Section title="Deck" subtitle="Total cards">
        {data?.map(deck => (
          <List.Item
            key={deck.deck_id}
            title={deck.name}
            subtitle={`${deck.total_in_deck}`}
            accessories={getDeckState(deck)}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Study Deck"
                  onPop={handleUpdateCache}
                  target={<StudyDeck deckName={deck.name} />}
                />
                <Action.Push
                  title="Browse Deck"
                  onPop={handleUpdateCache}
                  target={<BrowseCards deckName={`deck:"${deck.name}"`} />}
                />
                <Action.Push
                  title="Add Card To Deck"
                  onPop={handleUpdateCache}
                  shortcut={shortcuts.addCardToDeck}
                  target={<AddCardAction deckName={deck.name} />}
                />
                <Action.Push
                  title="Create New Deck"
                  onPop={handleUpdateCache}
                  shortcut={shortcuts.createNewDeck}
                  target={<CreateDeckAction />}
                />
                <Action
                  title="Delete Deck"
                  shortcut={shortcuts.deleteDeck}
                  onAction={async () => await handleDeleteDeck(deck.name)}
                />
                <Action title="Sync" shortcut={shortcuts.sync} onAction={handleSync} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
