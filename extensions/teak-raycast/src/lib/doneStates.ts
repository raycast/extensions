import type { RaycastCard } from "./api";

// What a link's done state is called, by the kind of link. Raycast can't
// import the workspace at publish time, so this copies Teak's own table
// (`LINK_CATEGORY_DONE_VERB`) and a test keeps the two in step.
export type DoneVerb =
  | "bought"
  | "cooked"
  | "done"
  | "listened"
  | "played"
  | "read"
  | "watched";

export const DONE_VERB_BY_CATEGORY: Record<string, DoneVerb> = {
  app: "done",
  article: "read",
  book: "read",
  course: "done",
  design_portfolio: "done",
  event: "done",
  game: "played",
  movie: "watched",
  music: "listened",
  news: "read",
  other: "done",
  place: "done",
  podcast: "listened",
  product: "bought",
  recipe: "cooked",
  repo: "done",
  research: "read",
  social_post: "done",
  software: "done",
  tv: "watched",
  typeface: "done",
};

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
