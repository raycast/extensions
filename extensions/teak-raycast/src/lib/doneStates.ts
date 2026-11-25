import type { RaycastCard } from "./api";
import { DONE_VERB_BY_CATEGORY, type DoneVerb } from "./doneVerbs";

export const doneVerb = (category?: string | null): DoneVerb =>
  (category && DONE_VERB_BY_CATEGORY[category]) || "done";

const capitalize = (value: string): string =>
  `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

export const canMarkDone = (card: RaycastCard): boolean => card.type === "link";

export const isDone = (card: RaycastCard): boolean =>
  typeof card.completedAt === "number";

export const doneActionTitle = (card: RaycastCard): string => {
  const verb = capitalize(doneVerb(card.linkCategory));
  return isDone(card) ? `Mark as Not ${verb}` : `Mark as ${verb}`;
};

export const doneStatusLabel = (card: RaycastCard): string =>
  capitalize(doneVerb(card.linkCategory));

export const doneToastTitle = (card: RaycastCard): string => {
  const verb = doneVerb(card.linkCategory);
  return isDone(card) ? `Marked as ${verb}` : `Marked as not ${verb}`;
};
