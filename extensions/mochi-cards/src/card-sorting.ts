import type { MochiCard } from "./services/mochi-client";

export const CARD_SORT_OPTIONS = [
  { value: "position", title: "Position" },
  { value: "alphabetical", title: "Alphabetical" },
  { value: "created-at", title: "Date Created" },
  { value: "updated-at", title: "Date Updated" },
  { value: "last-reviewed", title: "Last Reviewed" },
  { value: "review-count", title: "Review Count" },
] as const;

export type CardSort = (typeof CARD_SORT_OPTIONS)[number]["value"];

export function isCardSort(value: string): value is CardSort {
  return CARD_SORT_OPTIONS.some((option) => option.value === value);
}

export function isSortDescending(sort: CardSort, reversed = false): boolean {
  const descendingByDefault =
    sort === "created-at" || sort === "updated-at" || sort === "last-reviewed" || sort === "review-count";
  return reversed ? !descendingByDefault : descendingByDefault;
}

export function cardTitle(card: MochiCard): string {
  const name = card.name?.trim();
  if (name) {
    return name;
  }

  const firstLine = card.content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (firstLine) {
    return firstLine
      .replace(/^#{1,6}\s+/, "")
      .replace(/^[-*+]\s+/, "")
      .replace(/[*_~`]/g, "")
      .trim();
  }

  const firstField = card.fields.find((field) => String(field.value).trim().length > 0);
  return firstField ? String(firstField.value).trim().split("\n")[0] : "Untitled Card";
}

export function sortCards(cards: readonly MochiCard[], sort: CardSort, reversed = false): readonly MochiCard[] {
  return [...cards].sort((left, right) => compareCards(left, right, sort, reversed));
}

function compareCards(left: MochiCard, right: MochiCard, sort: CardSort, reversed: boolean): number {
  const direction = reversed ? -1 : 1;
  const comparison =
    sort === "position"
      ? compareOptionalStrings(left.position, right.position, direction)
      : sort === "alphabetical"
        ? compareTitles(left, right) * direction
        : sort === "created-at"
          ? compareOptionalTimestampsDescending(left.createdAt, right.createdAt, direction)
          : sort === "updated-at"
            ? compareOptionalTimestampsDescending(left.updatedAt, right.updatedAt, direction)
            : sort === "last-reviewed"
              ? compareOptionalTimestampsDescending(lastReviewDate(left), lastReviewDate(right), direction)
              : (right.reviews.length - left.reviews.length) * direction;

  return comparison || compareTitles(left, right) * direction || left.id.localeCompare(right.id) * direction;
}

function compareOptionalStrings(left: string | undefined, right: string | undefined, direction: number): number {
  if (left === undefined) {
    return right === undefined ? 0 : 1;
  }
  if (right === undefined) {
    return -1;
  }
  return (left < right ? -1 : left > right ? 1 : 0) * direction;
}

function compareTitles(left: MochiCard, right: MochiCard): number {
  return cardTitle(left).localeCompare(cardTitle(right), undefined, { sensitivity: "base" });
}

function compareOptionalTimestampsDescending(
  left: string | undefined,
  right: string | undefined,
  direction: number
): number {
  const leftTimestamp = timestamp(left);
  const rightTimestamp = timestamp(right);
  if (leftTimestamp === undefined) {
    return rightTimestamp === undefined ? 0 : 1;
  }
  if (rightTimestamp === undefined) {
    return -1;
  }
  return (rightTimestamp - leftTimestamp) * direction;
}

function lastReviewDate(card: MochiCard): string | undefined {
  return card.reviews.reduce<string | undefined>(
    (latest, review) => (latest === undefined || review.date > latest ? review.date : latest),
    undefined
  );
}

function timestamp(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}
