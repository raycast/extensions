import { Icon } from "@raycast/api";
import type { CardRequestDestination } from "../types";

/**
 * Everything the two dictionaries are called and promise, each in one place.
 *
 * Reason: the wording is mirrored from the web app's own `destination-copy`
 * rather than reworded here. A private card arriving in a minute against a
 * public request waiting days is the distinction the product is built on, and
 * a user who writes a word down in Raycast and finishes it on the web should
 * not be told two different things about where it went.
 */

/** The two dictionaries, in the order they are always offered. */
export const DICTIONARY_DESTINATIONS: CardRequestDestination[] = ["private", "public"];

type DestinationCopy = {
  /** What the dictionary is called wherever the user picks between them. */
  label: string;
  /** The mark it carries beside that name. */
  icon: Icon;
  /**
   * What the action is called. Private cards are generated; public ones are
   * requested, because asking the shared dictionary for a word is not the same
   * as buying your own copy.
   */
  submitTitle: string;
  /** What it promises once the action is taken. */
  promiseLine: string;
  /** What has become of the word, the moment it has gone. */
  queuedHeadline: string;
  /** What the action is called once Inoh has said it looks to have the card. */
  goAheadAnywayTitle: string;
};

export const DESTINATION_COPY: Record<CardRequestDestination, DestinationCopy> = {
  private: {
    label: "Private",
    icon: Icon.Lock,
    submitTitle: "Generate Private Card",
    promiseLine: "Yours only, about a minute.",
    queuedHeadline: "Your card generation is in a queue.",
    goAheadAnywayTitle: "Generate Anyway",
  },
  public: {
    label: "Public",
    icon: Icon.Globe,
    submitTitle: "Request Public Card",
    promiseLine: "Free, but not guaranteed. It might take days.",
    queuedHeadline: "Your card request is in a queue.",
    goAheadAnywayTitle: "Request Anyway",
  },
};
