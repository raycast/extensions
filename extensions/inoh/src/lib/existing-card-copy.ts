// What the user is told about a card Inoh looks to have already.
//
// Its own module rather than destination-copy, which is keyed by which
// dictionary a request is headed for. This wording turns on which dictionary
// the card was found in, which is a different question.

import type { ExistingCardSource } from "../types";

/**
 * What to say about a card Inoh looks to have already.
 *
 * Reason: hedged, and mirrored from the web app's `describeLikelyExistingCard`.
 * The shared dictionary is matched on what a card teaches rather than on its
 * wording, so it is a judgement and is worded as one.
 *
 * @param foundIn - Which dictionary the card was found in
 * @returns The headline for the toast that holds the word back
 */
export function describeLikelyExistingCard(foundIn: ExistingCardSource): string {
  return foundIn === "publicDictionary"
    ? "The dictionary looks to have this one already"
    : "You have made this card already";
}
