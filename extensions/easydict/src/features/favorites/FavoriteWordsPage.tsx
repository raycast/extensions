/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import {
  Action,
  ActionPanel,
  closeMainWindow,
  confirmAlert,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import StrokeOrderPage from "@/components/pages/StrokeOrderPage";
import { myPreferences } from "@/consts";
import { playQueryWordAudio, playTTS } from "@/core/audio";
import { getLangCode, lookupLanguageItem } from "@/core/language/utils";
import { getStrokeOrderCharacters } from "@/core/stroke-order";
import { logError } from "@/shared/logger";
import { shortcuts } from "@/shared/shortcuts";

import { addFavoritesToAnkiWithToast } from "./ankiToast";
import { copyAllText } from "./copyFavorites";
import { FavoriteStorageRecovery } from "./FavoriteStorageRecovery";
import { favoriteKeyOf, type FavoriteWord, resolveFavoriteTranslations } from "./model";
import { useFavoriteWords } from "./useFavoriteWords";
import { favoriteMarkdown } from "./view";

/**
 * Browse and manage favorite words saved from the dictionary view. Renders the
 * full saved snapshot offline in the detail pane; "Open in Easydict" re-queries
 * for the live result.
 */
export default function FavoriteWordsPage() {
  const { favorites, state, isLoading, revalidate, remove, clear, restore, restoreLegacy } = useFavoriteWords();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const copyAllTextContent = useMemo(() => copyAllText(favorites), [favorites]);

  useEffect(() => {
    if (!selectedId && favorites.length) setSelectedId(favoriteKeyOf(favorites[0].query));
  }, [favorites, selectedId]);

  if (state && state.kind !== "ready") {
    return (
      <FavoriteStorageRecovery
        state={state}
        onReload={revalidate}
        onRestore={restore}
        onRestoreLegacy={restoreLegacy}
      />
    );
  }

  const changeFavorites = async (change: () => Promise<void>) => {
    try {
      await change();
    } catch (error) {
      await showFailureToast(error, { title: "Failed to Update Favorites" });
    }
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Favorite Words"
      searchBarPlaceholder="Search favorite words..."
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
    >
      {favorites.length === 0 ? (
        <List.EmptyView
          icon={Icon.Star}
          title="No Favorite Words"
          description="Star a word from the dictionary view to save it here."
        />
      ) : (
        <List.Section title={`Favorites · ${favorites.length}`}>
          {favorites.map((favorite) => (
            <FavoriteItem
              key={favoriteKeyOf(favorite.query)}
              favorite={favorite}
              isSelected={selectedId === favoriteKeyOf(favorite.query)}
              copyAllContent={copyAllTextContent}
              onAddAllToAnki={() => addFavoritesToAnkiWithToast(favorites)}
              onRemove={() => changeFavorites(() => remove(favorite.query))}
              onClear={() => changeFavorites(clear)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function FavoriteItem({
  favorite,
  isSelected,
  copyAllContent,
  onAddAllToAnki,
  onRemove,
  onClear,
}: {
  favorite: FavoriteWord;
  isSelected: boolean;
  copyAllContent: string;
  onAddAllToAnki: () => void;
  onRemove: () => void;
  onClear: () => void;
}) {
  const markdown = useMemo(() => (isSelected ? favoriteMarkdown(favorite) : undefined), [favorite, isSelected]);
  const fromLanguageItem = lookupLanguageItem(favorite.query.fromLanguage);
  const toLanguageItem = lookupLanguageItem(favorite.query.toLanguage);
  const translations = resolveFavoriteTranslations(favorite);
  const translation = translations?.[0];
  const strokeOrderCharacters = getStrokeOrderCharacters({
    fromLanguage: favorite.query.fromLanguage,
    toLanguage: favorite.query.toLanguage,
    sourceText: favorite.query.word,
    translatedText: translations?.join("\n") ?? "",
  });
  const fromCode = getLangCode(favorite.query.fromLanguage, "googleLangCode") ?? favorite.query.fromLanguage;
  const toCode = getLangCode(favorite.query.toLanguage, "googleLangCode") ?? favorite.query.toLanguage;
  const languageDirection = `${fromCode.toUpperCase()} → ${toCode.toUpperCase()}`;

  const openInEasydict = async () => {
    try {
      await closeMainWindow();
      await launchCommand({
        name: "easydict",
        type: LaunchType.UserInitiated,
        arguments: { queryText: favorite.query.word },
      });
    } catch (error) {
      logError("FavoriteWordsPage", `launch easydict error: ${error}`);
      showFailureToast(String(error), { title: "Failed to open in Easydict" });
    }
  };

  return (
    <List.Item
      id={favoriteKeyOf(favorite.query)}
      title={favorite.query.word}
      subtitle={translation}
      accessories={
        myPreferences.flagsAreNotLanguages
          ? [{ text: languageDirection }]
          : [
              { icon: { source: fromLanguageItem?.emoji ?? "🌐" } },
              { icon: Icon.ArrowRight },
              { icon: { source: toLanguageItem?.emoji ?? "🌐" } },
            ]
      }
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action icon={Icon.MagnifyingGlass} title="Open in Easydict" onAction={openInEasydict} />
            <Action.CopyToClipboard title="Copy Translation" content={translation ?? favorite.query.word} />
            <Action.CopyToClipboard title="Copy All to Clipboard" icon={Icon.Clipboard} content={copyAllContent} />
            <Action
              icon={Icon.PlusCircle}
              title="Add to Anki"
              shortcut={shortcuts.addToAnki}
              onAction={() => addFavoritesToAnkiWithToast([favorite])}
            />
            <Action icon={Icon.PlusSquare} title="Add All to Anki" onAction={onAddAllToAnki} />
            {strokeOrderCharacters.length > 0 && (
              <Action.Push
                title="Show Stroke Order"
                icon={Icon.Brush}
                target={<StrokeOrderPage characters={strokeOrderCharacters} />}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Read Text Audio">
            <Action
              title="Read Word"
              icon={Icon.Play}
              shortcut={shortcuts.readQueryText}
              onAction={() => playQueryWordAudio(favorite.query)}
            />
            <Action
              title="Read Translation"
              icon={Icon.Play}
              onAction={() => translation && playTTS(translation, favorite.query.toLanguage)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Manage">
            <Action
              icon={Icon.Trash}
              title="Remove from Favorites"
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={onRemove}
            />
            <Action
              icon={Icon.Trash}
              title="Clear All Favorites"
              style={Action.Style.Destructive}
              onAction={async () => {
                if (
                  await confirmAlert({
                    title: "Clear All Favorites?",
                    message: "This removes every saved word and cannot be undone.",
                  })
                ) {
                  onClear();
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
