import type { RaycastCard } from "./api";
import { DONE_VERB_BY_CATEGORY, type DoneVerb } from "./doneVerbs";

export const doneVerb = (category?: string | null): DoneVerb =>
  (category && DONE_VERB_BY_CATEGORY[category]) || "done";

const capitalize = (value: string): string =>
  `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

/** Only links can be marked read, watched, bought or done. */
export const canMarkDone = (card: RaycastCard): boolean => card.type === "link";

export const isDone = (card: RaycastCard): boolean =>
  typeof card.completedAt === "number";

/** The toggle's title: "Mark as Read", or "Mark as Not Read" once it is. */
export const doneActionTitle = (card: RaycastCard): string => {
  const verb = capitalize(doneVerb(card.linkCategory));
  return isDone(card) ? `Mark as Not ${verb}` : `Mark as ${verb}`;
};

/** What the card is called once marked: "Read", "Watched", "Done". */
export const doneStatusLabel = (card: RaycastCard): string =>
  capitalize(doneVerb(card.linkCategory));

/** The toast after the toggle, from the new state. */
export const doneToastTitle = (card: RaycastCard): string => {
  const verb = doneVerb(card.linkCategory);
  return isDone(card) ? `Marked as ${verb}` : `Marked as not ${verb}`;
};
