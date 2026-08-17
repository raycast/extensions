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
import { useEffect, useState } from "react";

import { myPreferences } from "@/consts";
import { playQueryWordAudio, playTTS } from "@/core/audio";
import { getLanguageItem } from "@/core/language/utils";
import { useFavoriteWords } from "@/hooks";
import { favoriteKeyOf, type FavoriteWord } from "@/types/favorite";
import type { QueryWordInfo } from "@/types/query";
import { copyAllText } from "@/utils/copyFavorites";
import { logError } from "@/utils/logger";

/**
 * Render a favorite's saved display snapshot as offline markdown: each section
 * title followed by its items' details, preserving the original layout without
 * any network re-query.
 */
function aggregateMarkdown(favorite: FavoriteWord): string {
  return (
    favorite.displaySections
      .flatMap((section) =>
        section.items.map(
          (item) => item.showMoreDetailsMarkdown ?? item.detailsMarkdown ?? item.copyText ?? item.title,
        ),
      )
      .join("\n")
      .trim() || favorite.word
  );
}

/**
 * Reconstruct a minimal QueryWordInfo from saved fields so audio helpers work
 * offline (playQueryWordAudio only needs word / fromLanguage / isWord / speechUrl).
 */
function audioInfo(favorite: FavoriteWord): QueryWordInfo {
  return {
    word: favorite.word,
    fromLanguage: favorite.fromLanguage,
    toLanguage: favorite.toLanguage,
    isWord: favorite.isWord,
    speechUrl: favorite.displaySections[0]?.items[0]?.queryWordInfo.speechUrl,
  };
}

/**
 * Browse and manage favorite words saved from the dictionary view. Renders the
 * full saved snapshot offline in the detail pane; "Open in Easydict" re-queries
 * for the live result.
 */
export default function FavoriteWordsPage() {
  const { favorites, isLoading, remove, clear } = useFavoriteWords();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  // Compute once per render; passed to every item instead of recomputing in the map.
  const copyAllTextContent = copyAllText(favorites);

  useEffect(() => {
    if (!selectedId && favorites.length) setSelectedId(favoriteKeyOf(favorites[0]));
  }, [favorites, selectedId]);

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
              key={favoriteKeyOf(favorite)}
              favorite={favorite}
              copyAllContent={copyAllTextContent}
              onRemove={() => remove(favorite)}
              onClear={clear}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function FavoriteItem({
  favorite,
  copyAllContent,
  onRemove,
  onClear,
}: {
  favorite: FavoriteWord;
  copyAllContent: string;
  onRemove: () => void;
  onClear: () => void;
}) {
  const fromLanguageItem = getLanguageItem(favorite.fromLanguage);
  const toLanguageItem = getLanguageItem(favorite.toLanguage);
  const translation = favorite.translations?.[0];
  // Respect the same "flags are not languages" preference as TargetLanguageSection.
  const langIcon = (emoji: string) => (myPreferences.flagsAreNotLanguages ? Icon.Globe : { source: emoji });

  const openInEasydict = async () => {
    try {
      await closeMainWindow();
      await launchCommand({
        name: "easydict",
        type: LaunchType.UserInitiated,
        arguments: { queryText: favorite.word },
      });
    } catch (error) {
      logError("FavoriteWordsPage", `launch easydict error: ${error}`);
      showFailureToast(String(error), { title: "Failed to open in Easydict" });
    }
  };

  return (
    <List.Item
      id={favoriteKeyOf(favorite)}
      title={favorite.word}
      subtitle={translation}
      accessories={[
        { icon: langIcon(fromLanguageItem.emoji) },
        { icon: Icon.ArrowRight },
        { icon: langIcon(toLanguageItem.emoji) },
      ]}
      detail={<List.Item.Detail markdown={aggregateMarkdown(favorite)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action icon={Icon.MagnifyingGlass} title="Open in Easydict" onAction={openInEasydict} />
            <Action.CopyToClipboard title="Copy Translation" content={translation ?? favorite.word} />
            <Action.CopyToClipboard title="Copy All to Clipboard" icon={Icon.Clipboard} content={copyAllContent} />
          </ActionPanel.Section>

          <ActionPanel.Section title="Read Text Audio">
            <Action
              title="Read Word"
              icon={Icon.Play}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => playQueryWordAudio(audioInfo(favorite))}
            />
            <Action
              title="Read Translation"
              icon={Icon.Play}
              onAction={() => translation && playTTS(translation, favorite.toLanguage, { truncate: true })}
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
