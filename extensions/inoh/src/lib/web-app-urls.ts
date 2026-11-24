import { WEB_APP_URL } from "../constants";
import type { CardRequestDestination } from "../types";

/**
 * Web app pages that need more than their address to be useful.
 *
 * Reason: the plain pages are constants in `../constants`. This one takes the
 * dictionary a word went to, so it is built rather than named, and the
 * unfiltered address is kept private here: opening it would show the default
 * dictionary rather than the one the user just sent a word to.
 */

/**
 * Everything already asked for, and what became of it. The composer only ever
 * holds what has not been sent yet, so this is where a card in the queue, in
 * the deck, or turned down is looked up.
 */
const MY_REQUESTS_URL = `${WEB_APP_URL}/my-requests`;

/**
 * My Requests, showing the dictionary a word actually went to.
 *
 * Reason: the list opens on Private, so sending a word to the public
 * dictionary and then opening an unfiltered list would show none of the work
 * just done. The web app's Generate tab passes the same parameter.
 *
 * @param destination - Which dictionary the word went to
 * @returns The URL of the list filtered to it
 */
export function buildMyRequestsUrl(destination: CardRequestDestination): string {
  return `${MY_REQUESTS_URL}?dictionary=${destination}`;
}
