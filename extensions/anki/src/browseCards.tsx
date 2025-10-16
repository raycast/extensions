import AddCardAction from './actions/AddCardAction';
import ViewCardMedia from './actions/ViewCardMedia';
import guiActions from './api/guiActions';
import noteActions from './api/noteActions';
import useTurndown from './hooks/useTurndown';
import { Action, ActionPanel, confirmAlert, Detail, List, showToast, Toast } from '@raycast/api';
import { Card, FieldMediaMap, ShortcutDictionary } from './types';
import { delay, getCardType, parseMediaFiles } from './util';
import { useCachedPromise } from '@raycast/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useErrorHandling from './hooks/useErrorHandling';
import { ankiReq } from './api/ankiClient';

interface Props {
  deckName?: string;
}
export default function BrowseCards({ deckName }: Props) {
  const { turndown } = useTurndown();
  const { handleError, errorMarkdown } = useErrorHandling();

  const shortcuts = useMemo((): ShortcutDictionary => {
    return {
      addCard: { modifiers: ['cmd'], key: 'n' },
      deleteCard: { modifiers: ['cmd'], key: 'd' },
      openAnkiManual: { modifiers: ['cmd'], key: 'o' },
      guiBrowse: { modifiers: ['cmd'], key: 'g' },
    };
  }, []);

  const [query, setQuery] = useState<string>(() => deckName || '');
  const [metadataVisible, setMetadataVisible] = useState<boolean>(false);
  const [selectedCardID, setSelectedCardID] = useState<string | null>(null);
  const [cardMedia, setCardMedia] = useState<FieldMediaMap>();

  const { data, isLoading, error, pagination, revalidate } = useCachedPromise(
    (query: string) =>
      async (options: { page: number }): Promise<{ data: Card[]; hasMore: boolean }> => {
        const defaultQuery = 'deck:_*';
        const pageSize = 40;

        await delay(2);

        if (!query || !query.trim()) {
          query = defaultQuery;
        }

        const cardIDs: number[] = await ankiReq('findCards', {
          query: query,
        });

        await delay(2);

        const start = options.page * pageSize;
        const end = start + pageSize;
        const pageCardIDs = cardIDs.slice(start, end);

        const cardsInfo: Card[] = await ankiReq('cardsInfo', {
          cards: pageCardIDs,
        });

        return {
          data: cardsInfo,
          hasMore: end < cardIDs.length,
        };
      },
    [query],
    { keepPreviousData: true }
  );

  useEffect(() => {
    if (!error) return;
    handleError(error);
  }, [error]);

  const handleUpdateQuery = useCallback(
    (text: string) => {
      setQuery(text);
    },
    [query]
  );

  useEffect(() => {
    if (!data || !selectedCardID) return;
    const card = data.find(item => item.cardId === Number(selectedCardID));
    if (!card) {
      return;
    }

    const newFieldMediaMap: FieldMediaMap = {};

    Object.entries(card.fields).forEach(([fieldName, fieldObj]) => {
      const mediaFiles = parseMediaFiles(fieldObj.value);
      if (mediaFiles.length > 0) {
        newFieldMediaMap[fieldName] = mediaFiles;
      }
    });

    setCardMedia(newFieldMediaMap);
  }, [data, selectedCardID]);

  const handleDeleteCard = useCallback(async (cardId: string | null) => {
    if (!cardId) return;

    const deleteConfirm = await confirmAlert({
      title: `Are you sure you want to delete this card?`,
    });

    if (!deleteConfirm) return;

    try {
      await noteActions.deleteNote(Number(cardId));
      showToast({
        title: 'Deleted card successfully',
        style: Toast.Style.Success,
      });
      revalidate();
    } catch (error) {
      handleError(error);
    }
  }, []);

  const handleToggleMetadata = useCallback(
    () => setMetadataVisible(!metadataVisible),
    [metadataVisible]
  );

  const handleGuiBrowse = useCallback(async () => {
    try {
      await guiActions.guiBrowse(query);
    } catch (error: unknown) {
      handleError(error);
    }
  }, [query]);

  const handleSelectionChange = useCallback((id: string | null) => setSelectedCardID(id), []);

  const listItemActions = useMemo(() => {
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            title="Toggle Metadata"
            shortcut={shortcuts.toggleMetadata}
            onAction={handleToggleMetadata}
          />
          <Action.Push
            title="Create New Card"
            onPop={revalidate}
            shortcut={shortcuts.addCard}
            target={<AddCardAction />}
          />
          <Action
            title="Delete Card"
            shortcut={shortcuts.deleteCard}
            onAction={() => handleDeleteCard(selectedCardID)}
          />
          {cardMedia && (
            <Action.Push
              title="View Card Files"
              shortcut={shortcuts.viewFiles}
              target={<ViewCardMedia cardMedia={cardMedia} />}
            />
          )}
        </ActionPanel.Section>
        <ActionPanel.Section />
        <Action
          title="Browse Cards In Anki"
          shortcut={shortcuts.guiBrowse}
          onAction={handleGuiBrowse}
        />
        <ActionPanel.Section />
        <Action.OpenInBrowser
          url="https://docs.ankiweb.net/searching.html"
          title="Open Anki Manual"
          shortcut={shortcuts.openAnkiManual}
        />
      </ActionPanel>
    );
  }, [handleDeleteCard, handleToggleMetadata, handleGuiBrowse, shortcuts, cardMedia]);

  const handleMapListItems = useCallback(
    (card: Card) => {
      if (!card || !turndown) return null;

      const fields = Object.entries(card.fields);
      const title = turndown.turndown(fields[0][1].value);

      const markdown = fields
        .map(([key, field]) => `#### ${key}\n___\n${turndown.turndown(field.value)}`)
        .join('\n\n');

      return (
        <List.Item
          id={card.cardId.toString()}
          key={card.cardId}
          actions={listItemActions}
          title={title}
          detail={
            <List.Item.Detail
              markdown={markdown}
              key={card.cardId}
              metadata={
                metadataVisible && (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Deck" text={card.deckName} />
                    <List.Item.Detail.Metadata.Label title="Model" text={card.modelName} />
                    <List.Item.Detail.Metadata.Label
                      title="Repetitions"
                      text={card.reps.toString()}
                    />
                    <List.Item.Detail.Metadata.Label title="Lapses" text={card.lapses.toString()} />
                    <List.Item.Detail.Metadata.Label title="Type" text={getCardType(card.type)} />
                    <List.Item.Detail.Metadata.Label
                      title="Last Modified"
                      text={new Date(card.mod * 1000).toLocaleString()}
                    />
                  </List.Item.Detail.Metadata>
                )
              }
              isLoading={isLoading}
            />
          }
        />
      );
    },
    [handleToggleMetadata, turndown, isLoading, metadataVisible, listItemActions]
  );

  return (
    <>
      {error ? (
        <Detail markdown={errorMarkdown} />
      ) : (
        <List
          isShowingDetail
          searchBarPlaceholder="Search cards..."
          isLoading={isLoading}
          searchText={query}
          onSelectionChange={handleSelectionChange}
          onSearchTextChange={handleUpdateQuery}
          pagination={pagination}
        >
          {data?.map(handleMapListItems)}
        </List>
      )}
    </>
  );
}
