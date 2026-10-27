/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { showToast, Toast } from "@raycast/api";

import { myPreferences } from "@/consts";
import { normalizeError } from "@/shared/errors";
import { logError, logTrace } from "@/shared/logger";

import { addFavoritesToAnki, resolveAnkiDeckName } from "./anki";
import type { FavoriteWord } from "./model";

/**
 * Add favorites to the preferred Anki deck and report the outcome in one toast.
 * `justFavorited` words were saved to Favorites in the same action, so a failure
 * here must not read as if the favorite itself was lost.
 */
export async function addFavoritesToAnkiWithToast(
  favorites: readonly FavoriteWord[],
  { justFavorited = false }: { justFavorited?: boolean } = {},
) {
  const deckName = resolveAnkiDeckName(myPreferences.ankiDeckName);
  const toast = await showToast({ style: Toast.Style.Animated, title: "Adding to Anki..." });
  try {
    const { added, skipped, failed } = await addFavoritesToAnki(favorites, {
      deckName,
      url: myPreferences.ankiConnectUrl,
    });
    logTrace("Anki", `deck=${deckName}, added=${added}, skipped=${skipped}, failed=${failed}`);
    if (failed) {
      toast.style = Toast.Style.Failure;
      toast.title = justFavorited
        ? "Added to Favorites; Some Anki Cards Failed"
        : `Failed to add ${failed} ${failed === 1 ? "Word" : "Words"} to Anki`;
      toast.message = added ? `${added} added; retry the failed words.` : "Retry the failed words.";
    } else {
      toast.style = Toast.Style.Success;
      if (justFavorited) {
        toast.title = added ? "Added to Favorites and Anki" : "Added to Favorites";
        toast.message = added ? `Deck: ${deckName}` : `Already in Anki deck "${deckName}"`;
      } else {
        toast.title = added ? `Added ${added} ${added === 1 ? "Word" : "Words"} to Anki` : "Already in Anki";
        toast.message = added && skipped ? `${skipped} already in "${deckName}"` : `Deck: ${deckName}`;
      }
    }
  } catch (error) {
    logError("Anki", `add to anki error: ${error}`);
    toast.style = Toast.Style.Failure;
    toast.title = justFavorited ? "Added to Favorites, Not to Anki" : "Failed to Add to Anki";
    toast.message = normalizeError(error).message;
  }
}
