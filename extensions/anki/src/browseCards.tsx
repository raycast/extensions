import EditNoteAction from './actions/EditNoteAction';
import { createCardPageLoader } from './helpers/cardPages';
import AddCardAction from './actions/AddCardAction';
import ViewCardMedia from './actions/ViewCardMedia';
import guiActions from './api/guiActions';
import noteActions from './api/noteActions';
import useTurndown from './hooks/useTurndown';
import {
  Action,
  ActionPanel,
  confirmAlert,
  Detail,
  List,
  showToast,
  Toast,
  Keyboard,
} from '@raycast/api';
import { Card, FieldMediaMap, ShortcutDictionary } from './types';
import { getCardType, parseMediaFiles } from './util';
import { useCachedPromise } from '@raycast/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useErrorHandling from './hooks/useErrorHandling';

interface Props {
  deckName?: string;
}
export default function BrowseCards({ deckName }: Props) {
  const { turndown, isLoading: mediaLoading, error: mediaError } = useTurndown();

  const shortcuts = useMemo((): ShortcutDictionary => {
    return {
      addCard: { modifiers: ['cmd'], key: 'n' },
      deleteNote: { modifiers: ['cmd'], key: 'd' },
      openAnkiManual: { modifiers: ['cmd'], key: 'o' },
      guiBrowse: { modifiers: ['cmd'], key: 'g' },
    };
  }, []);

  const [query, setQuery] = useState<string>(() => deckName || '');
  const [metadataVisible, setMetadataVisible] = useState<boolean>(false);

  const loadCardPage = useMemo(() => createCardPageLoader(), []);
  const {
    data,
    isLoading: cardsLoading,
    error: cardsError,
    pagination,
    revalidate,
  } = useCachedPromise(loadCardPage, [query], { keepPreviousData: true });
  const isLoading = cardsLoading || mediaLoading;
  const error = cardsError || mediaError;
  const { handleError, errorMarkdown } = useErrorHandling(error);

  useEffect(() => {
    if (!error) return;
    handleError(error);
  }, [error]);

  const handleUpdateQuery = useCallback((text: string) => {
    setQuery(text);
  }, []);

  const handleDeleteNote = useCallback(
    async (cardId: number) => {
      const deleteConfirm = await confirmAlert({
        title: 'Delete Note?',
        message: 'This deletes the note and all associated cards, including cards in other decks.',
        primaryAction: { title: 'Delete Note' },
      });

      if (!deleteConfirm) return;

      try {
        await noteActions.deleteNote(cardId);
        await showToast({
          title: 'Deleted note and all associated cards',
          style: Toast.Style.Success,
        });
        await revalidate();
      } catch (error) {
        handleError(error);
      }
    },
    [handleError, revalidate]
  );

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

  const handleMapListItems = useCallback(
    (card: Card) => {
      if (!card || !turndown) return null;

      const fields = Object.entries(card.fields).sort(([, a], [, b]) => a.order - b.order);
      const title = turndown.turndown(fields[0]?.[1].value || '(Empty note)');

      const markdown = fields
        .map(([key, field]) => `#### ${key}\n___\n${turndown.turndown(field.value)}`)
        .join('\n\n');

      const cardMedia: FieldMediaMap = Object.fromEntries(
        fields
          .map(([fieldName, field]) => [fieldName, parseMediaFiles(field.value)] as const)
          .filter(([, mediaFiles]) => mediaFiles.length > 0)
      );

      return (
        <List.Item
          id={card.cardId.toString()}
          key={card.cardId}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Edit Note"
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  onPop={revalidate}
                  target={<EditNoteAction noteId={card.note} />}
                />
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
                  title="Delete Note"
                  shortcut={shortcuts.deleteNote}
                  onAction={() => handleDeleteNote(card.cardId)}
                />
                {Object.keys(cardMedia).length > 0 && (
                  <Action.Push
                    title="View Card Files"
                    shortcut={shortcuts.viewFiles}
                    target={<ViewCardMedia cardMedia={cardMedia} />}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section />
              <Action
                title="Browse Cards in Anki"
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
          }
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
    [
      handleToggleMetadata,
      handleDeleteNote,
      handleGuiBrowse,
      turndown,
      isLoading,
      metadataVisible,
      shortcuts,
      revalidate,
    ]
  );

  return (
    <>
      {error ? (
        <Detail markdown={errorMarkdown} />
      ) : (
        <List
          isShowingDetail
          filtering={false}
          throttle
          searchBarPlaceholder="Search cards..."
          isLoading={isLoading}
          searchText={query}
          onSearchTextChange={handleUpdateQuery}
          pagination={pagination}
        >
          {data?.map(handleMapListItems)}
        </List>
      )}
    </>
  );
}
