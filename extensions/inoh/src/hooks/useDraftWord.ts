import { showToast, Toast } from "@raycast/api";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { GENERATE_URL } from "../constants";
import { saveWordToDrafts } from "../lib/card-request-drafts";
import { describeUnfinishedDraft } from "../lib/drafts-copy";
import { buildOpenUrlToastAction } from "../lib/toast-actions";

type UseDraftWordOptions = {
  /** The signed-in user, or null when nobody is signed in. */
  user: User | null;
  /** Called instead of saving when there is no account to save into. */
  onSignInRequired: () => void;
};

type UseDraftWord = {
  /** The word most recently written down, or null before the first save. */
  savedWord: string | null;
  /** Writes a word down and reports the outcome in a toast. */
  saveWord: (word: string) => Promise<void>;
  /**
   * The same, for an account this hook has not seen yet.
   *
   * Reason: a save interrupted by the sign-in view resumes from the closure it
   * was created in, where `user` is still null. The freshly signed-in account
   * is passed in rather than read from state that has not updated yet.
   */
  saveWordForUser: (signedInUserId: string, word: string) => Promise<void>;
};

/**
 * Says there is nothing to save, when there is nothing to save.
 *
 * @param word - The search text being saved
 * @returns Whether it warned, which is also whether the caller should stop
 */
async function _hasWarnedWordIsBlank(word: string): Promise<boolean> {
  if (word.trim().length > 0) return false;

  await showToast({ style: Toast.Style.Failure, title: "Type a word to save" });
  return true;
}

/**
 * Hook that writes a word the dictionary does not have to the user's Inoh
 * drafts, and remembers which word that was. Why the card is not made here:
 * see `lib/card-request-drafts`.
 *
 * The saved word is kept rather than only announced, because the success
 * toast fades while the word is still in the search bar: the list itself then
 * shows the web app link that finishes the card.
 */
export function useDraftWord({ user, onSignInRequired }: UseDraftWordOptions): UseDraftWord {
  const [savedWord, setSavedWord] = useState<string | null>(null);

  async function saveWord(word: string) {
    // Reason: checked before the sign-in prompt. A whitespace-only search
    // reaches this action with nothing to save, and sending the user through
    // sign-in first only to do nothing afterwards is the worst of both.
    if (await _hasWarnedWordIsBlank(word)) return;

    if (!user) {
      onSignInRequired();
      return;
    }

    await saveWordForUser(user.id, word);
  }

  async function saveWordForUser(signedInUserId: string, word: string) {
    // Reason: guarded again, because the sign-in resume calls this directly.
    if (await _hasWarnedWordIsBlank(word)) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to drafts..." });

    const saveResult = await saveWordToDrafts(signedInUserId, word);

    if (saveResult.status === "failed") {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't save to drafts";
      toast.message = saveResult.error;
      return;
    }

    setSavedWord(saveResult.word);

    toast.style = Toast.Style.Success;
    toast.title = saveResult.status === "saved" ? "Saved to drafts" : "Already in your drafts";
    toast.message = describeUnfinishedDraft(saveResult.word);
    toast.primaryAction = buildOpenUrlToastAction("Open Inoh", GENERATE_URL, { modifiers: ["cmd"], key: "o" });
  }

  return { savedWord, saveWord, saveWordForUser };
}
