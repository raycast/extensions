import { open, showToast, Toast } from "@raycast/api";
import { PLANS_URL } from "../constants";
import { addCardToDeck, removeCardFromDeck } from "./card";
import { fetchDecks } from "./decks";
import type { Deck, DictionaryEntry } from "../types";

/**
 * Adds a card to an explicit deck and reports the result, including undo.
 *
 * @param userId - The account adding the card
 * @param entry - The dictionary entry to add
 * @param deckId - The destination deck, resolved for this account
 * @param onCardsChanged - Refreshes the displayed cards after adding or undoing
 */
export async function addCardWithFeedback(
  userId: string,
  entry: DictionaryEntry,
  deckId: string,
  onCardsChanged: () => void,
) {
  if (!deckId) {
    await _reportMissingDeck();
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Adding card..." });

  const additionResult = await addCardToDeck(userId, entry, deckId);

  if (additionResult.success) {
    const addedCardId = additionResult.cardId;
    toast.style = Toast.Style.Success;
    toast.title = "Card added";
    toast.message = `${entry.word} · press ⌘Z to undo`;
    toast.primaryAction = {
      title: "Undo",
      shortcut: { modifiers: ["cmd"], key: "z" },
      onAction: (addedToast) => _undoCardAddition(addedToast, addedCardId, entry.word, onCardsChanged),
    };
    onCardsChanged();
    return;
  }

  toast.style = Toast.Style.Failure;
  toast.title = "Failed to add card";
  toast.message = additionResult.error;

  if (additionResult.isPlanLimit) {
    toast.primaryAction = {
      title: "Upgrade Plan",
      onAction: async (limitToast) => {
        await open(PLANS_URL);
        await limitToast.hide();
      },
    };
  }
}

/**
 * Resumes adding the original entry to the account's first deck after sign-in.
 *
 * @param userId - The account that just signed in
 * @param entry - The dictionary entry selected before sign-in
 * @param onCardsChanged - Refreshes the displayed cards after adding or undoing
 */
export async function addCardAfterSignIn(userId: string, entry: DictionaryEntry, onCardsChanged: () => void) {
  // Reason: the signed-out callback has no deck selection. Fetch this account's
  // decks directly instead of waiting for captured render state to change.
  const signedInDecks = await _loadDecksForAdd(userId);
  if (signedInDecks === null) return;
  const firstDeck = signedInDecks[0];
  if (!firstDeck) {
    await _reportMissingDeck();
    return;
  }
  await addCardWithFeedback(userId, entry, firstDeck.id, onCardsChanged);
}

async function _loadDecksForAdd(userId: string): Promise<Deck[] | null> {
  try {
    return await fetchDecks(userId);
  } catch (deckError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't load decks",
      message: deckError instanceof Error ? deckError.message : "Try adding the card again.",
    });
    return null;
  }
}

async function _reportMissingDeck() {
  await showToast({ style: Toast.Style.Failure, title: "No deck selected" });
}

async function _undoCardAddition(addedToast: Toast, addedCardId: string, word: string, onCardsChanged: () => void) {
  addedToast.style = Toast.Style.Animated;
  addedToast.title = "Undoing...";
  const removalResult = await removeCardFromDeck(addedCardId);
  if (removalResult.success) {
    addedToast.style = Toast.Style.Success;
    addedToast.title = "Card removed";
    addedToast.message = word;
    addedToast.primaryAction = undefined;
    onCardsChanged();
  } else {
    addedToast.style = Toast.Style.Failure;
    addedToast.title = "Couldn't undo";
    addedToast.message = removalResult.error;
  }
}
