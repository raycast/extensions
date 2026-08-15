import AddCardAction from './actions/AddCardAction';
import BrowseCards from './browseCards';
import CreateDeckAction from './actions/CreateDeckAction';
import deckActions from './api/deckActions';
import miscellaneousActions from './api/miscellaneousActions';
import { Action, ActionPanel, confirmAlert, Detail, List, showToast, Toast } from '@raycast/api';
import { DeckStats, ShortcutDictionary } from './types';
import { StudyDeck } from './actions/StudyDeck';
import { combineDeckInfo, delay, getDeckState } from './util';
import { useCachedPromise } from '@raycast/utils';
import { useCallback, useEffect, useMemo } from 'react';
import useErrorHandling from './hooks/useErrorHandling';
import { ankiReq } from './api/ankiClient';

export default function Decks() {
  const { data, isLoading, revalidate, error, pagination } = useCachedPromise(
    () =>
      async (options: { page: number }): Promise<{ data: DeckStats[]; hasMore: boolean }> => {
        const pageSize = 20;

        const allDeckNames: { [key: string]: number } = await ankiReq('deckNamesAndIds');

        const deckEntries = Object.entries(allDeckNames);
        const start = options.page * pageSize;
        const end = start + pageSize;
        const paginatedDeckEntries = deckEntries.slice(start, end);

        const paginatedDeckNames = Object.fromEntries(paginatedDeckEntries);

        await delay(1);

        const deckStats: { [key: string]: DeckStats } = await ankiReq('getDeckStats', {
          decks: paginatedDeckNames,
        });

        const combinedDeckInfo = combineDeckInfo(deckStats, paginatedDeckNames);

        return {
          data: combinedDeckInfo,
          hasMore: end < deckEntries.length,
        };
      },
    [],
    { keepPreviousData: true }
  );

  const { handleError, errorMarkdown } = useErrorHandling();

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
        handleError(error);
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
      handleError(error);
    }
  }, []);

  useEffect(() => {
    if (!error) return;
    handleError(error);
  }, [error]);

  const handleUpdateCache = useCallback(() => revalidate(), []);

  return (
    <>
      {error ? (
        <Detail markdown={errorMarkdown} />
      ) : (
        <List
          isLoading={isLoading}
          navigationTitle="Search Decks"
          searchBarPlaceholder="Enter deck name..."
          pagination={pagination}
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
      )}
    </>
  );
}
