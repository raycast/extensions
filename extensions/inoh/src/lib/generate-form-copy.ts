// What the Generate command says back: what the form is still missing, and
// what each answer from the database reads like once it lands in a toast.
//
// Kept out of the form so the component is left with the form.

import { Toast } from "@raycast/api";
import { PLANS_URL } from "../constants";
import { DESTINATION_COPY } from "./destination-copy";
import { describeLikelyExistingCard } from "./existing-card-copy";
import { foldTextForComparison } from "./text-comparison";
import { buildOpenUrlToastAction } from "./toast-actions";
import { buildMyRequestsUrl } from "./web-app-urls";
import type { CardRequestDestination, RequestCardResult } from "../types";

/**
 * Identifies one ask, so a card already shown for it is not shown again.
 *
 * @param word - The word as typed
 * @param definition - The definition as typed
 * @returns A key for the pair
 */
export const buildAskKey = (word: string, definition: string) =>
  `${foldTextForComparison(word)}|${foldTextForComparison(definition)}`;

/**
 * What the form is still missing, in the words to say about it.
 *
 * Reason: the definition is checked here rather than left to the database, which
 * refuses a request without one in words written for a constraint violation.
 *
 * @param word - The word as typed
 * @param definition - The definition as typed
 * @returns What to ask for, or null when the form is ready to send
 */
export function findMissingFieldTitle(word: string, definition: string): string | null {
  if (word.trim().length === 0) return "Type the word to make a card for";
  if (definition.trim().length === 0) return "Write the definition the card should teach";
  return null;
}

/**
 * Reports a refused request: the database's own sentence, and the upgrade when
 * there is one to offer. The word stays written down as a draft either way,
 * which the message says out loud because the form is about to be cleared.
 *
 * @param toast - The toast raised when the request was sent
 * @param refusal - What the database would not take, and why
 * @param isUpgradeOffered - Whether the user has a plan to move up to
 */
export function reportRefusal(
  toast: Toast,
  refusal: Extract<RequestCardResult, { status: "refused" }>,
  isUpgradeOffered: boolean,
) {
  toast.style = Toast.Style.Failure;
  // Reason: a short headline over the refusal itself. The database names the
  // plan and its monthly limit in a full sentence ("your Free plan makes 50
  // private cards a month and you have used them all…"), which is too long to
  // read as a title.
  toast.title = refusal.isPlanLimit ? "Private card limit reached" : "Word not taken";
  toast.message = `${refusal.reason} "${refusal.word}" is waiting in your drafts.`;

  if (isUpgradeOffered) {
    toast.primaryAction = buildOpenUrlToastAction("Upgrade Plan", PLANS_URL);
  }
}

/**
 * Reports a word Inoh looks to have a card for already, and offers the way
 * through.
 *
 * Reason: not styled as a failure. Nothing was turned down, the word is still
 * written down as a draft, and the only thing missing is the user saying
 * whether the card Inoh found is the card they meant. A failure toast would
 * tell them something went wrong when nothing did.
 *
 * The way through is the submit button, not an action on this toast. A toast
 * action cannot take the shortcut the form's own submit already owns, so
 * Raycast hides it behind the toast menu at cmd+T with no label on it, which
 * is nowhere anybody would look. Pressing submit again is what goes ahead.
 *
 * @param toast - The toast raised when the request was sent
 * @param held - The word and the card Inoh thinks it already is
 * @param goAheadTitle - What the submit button now says, named here so the
 *   toast tells the user which key to press again
 */
export function reportHeld(toast: Toast, held: Extract<RequestCardResult, { status: "held" }>, goAheadTitle: string) {
  toast.style = Toast.Style.Success;
  toast.title = describeLikelyExistingCard(held.likelyExisting.foundIn);
  toast.message =
    `${held.likelyExisting.word}: ${held.likelyExisting.definition}. ` +
    `Press ${goAheadTitle} again to make yours anyway.`;
}

/**
 * Confirms the card has been asked for, and offers the list it will show up in.
 *
 * @param toast - The toast raised when the request was sent
 * @param destination - Which dictionary it went to, which is all of the copy
 */
export function reportQueued(toast: Toast, destination: CardRequestDestination) {
  const myRequestsUrl = buildMyRequestsUrl(destination);

  toast.style = Toast.Style.Success;
  toast.title = DESTINATION_COPY[destination].queuedHeadline;
  // Reason: the address is spelled out rather than left to the action alone.
  // The toast fades, and the page is where the card is watched from there on.
  toast.message = `See ${myRequestsUrl}`;
  toast.primaryAction = buildOpenUrlToastAction("My Requests", myRequestsUrl, { modifiers: ["cmd"], key: "o" });
}
