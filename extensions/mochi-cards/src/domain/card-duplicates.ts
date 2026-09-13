import type { FieldValues, CardTemplate } from "./template";

export type NamedCard = {
  readonly id: string;
  readonly name: string | null;
};

export type CreatedNamedCard = NamedCard & {
  readonly createdAt?: string;
};

export type DuplicateCardGroup<T extends CreatedNamedCard> = {
  readonly normalizedName: string;
  readonly title: string;
  readonly cards: readonly T[];
};

export function findDuplicateCardGroups<T extends CreatedNamedCard>(
  cards: readonly T[]
): readonly DuplicateCardGroup<T>[] {
  const groups = new Map<string, NamedEntry<T>[]>();

  for (const card of cards) {
    if (card.name === null) {
      continue;
    }
    const normalizedName = normalizeCardName(card.name);
    if (!normalizedName) {
      continue;
    }
    const entry: NamedEntry<T> = { name: card.name, card };
    const existingEntries = groups.get(normalizedName);
    if (existingEntries) {
      existingEntries.push(entry);
    } else {
      groups.set(normalizedName, [entry]);
    }
  }

  return [...groups]
    .filter(([, entries]) => entries.length > 1)
    .map(([normalizedName, entries]) => {
      const sortedEntries = [...entries].sort(compareByCreation);
      return {
        normalizedName,
        title: displayCardName(sortedEntries[0].name),
        cards: sortedEntries.map((entry) => entry.card),
      };
    })
    .sort(
      (left, right) => left.title.localeCompare(right.title) || left.normalizedName.localeCompare(right.normalizedName)
    );
}

type NamedEntry<T extends CreatedNamedCard> = {
  readonly name: string;
  readonly card: T;
};

function compareByCreation<T extends CreatedNamedCard>(left: NamedEntry<T>, right: NamedEntry<T>): number {
  const leftCreatedAt = creationTimestamp(left.card.createdAt);
  const rightCreatedAt = creationTimestamp(right.card.createdAt);
  if (leftCreatedAt !== rightCreatedAt) {
    if (leftCreatedAt === undefined) {
      return 1;
    }
    if (rightCreatedAt === undefined) {
      return -1;
    }
    return leftCreatedAt - rightCreatedAt;
  }
  return left.card.id.localeCompare(right.card.id);
}

function creationTimestamp(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function findDuplicateCardByName(cards: readonly NamedCard[], candidateName: string): NamedCard | undefined {
  const normalizedCandidate = normalizeCardName(candidateName);
  if (!normalizedCandidate) {
    return undefined;
  }
  return cards.find((card) => card.name !== null && normalizeCardName(card.name) === normalizedCandidate);
}

export function normalizeCardName(value: string): string {
  return displayCardName(value).toLowerCase();
}

// Keeps the case a card was created with, but drops the whitespace noise a group header must not show.
function displayCardName(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

export function selectDuplicateCandidate(
  template: CardTemplate,
  values: FieldValues,
  mode: "create" | "update",
  renderedMarkdown?: string
): string | undefined {
  if (mode !== "create") {
    return undefined;
  }
  if (template.output.kind === "card-body") {
    return renderedMarkdown === undefined ? undefined : deriveMochiCardName(renderedMarkdown);
  }
  const primaryField = template.fields[0];
  const primaryValue = primaryField ? values[primaryField.id] : undefined;
  return typeof primaryValue === "string" ? primaryValue : undefined;
}

export function deriveMochiCardName(content: string): string {
  const withoutComments = content.replace(/<!--[\s\S]*?-->/gu, "");
  return findMochiCardName(withoutComments.split(/\r?\n/u)) ?? "Untitled card";
}

type MochiFence = {
  readonly marker: "`" | "~";
  readonly length: number;
};

function findMochiCardName(lines: readonly string[]): string | undefined {
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentIndex >= 0) {
    const openingFence = parseMochiFence(lines[firstContentIndex]);
    if (openingFence) {
      return findMochiFencedName(lines, firstContentIndex, openingFence);
    }
  }

  let isInFence = false;

  for (const sourceLine of lines) {
    const fence = /^\s{0,3}(?:`{3,}|~{3,})/u.test(sourceLine);
    if (fence) {
      isInFence = !isInFence;
      continue;
    }
    const name = cleanMochiNameLine(sourceLine, isInFence);
    if (name.trim().length > 0) {
      return name.replace(/^\s+/u, "");
    }
  }

  return undefined;
}

function findMochiFencedName(
  lines: readonly string[],
  openingIndex: number,
  openingFence: MochiFence
): string | undefined {
  const closingIndex = lines.findIndex(
    (line, index) => index > openingIndex && parseMochiFence(line)?.marker === openingFence.marker
  );

  // Mochi lets ``` close a ```` fence and keeps the extra marker in the name, unlike CommonMark.
  if (closingIndex < 0) {
    return openingFence.marker;
  }

  const closingFence = parseMochiFence(lines[closingIndex]);
  if (!closingFence) {
    return undefined;
  }
  const name = findMochiCardName(lines.slice(openingIndex + 1, closingIndex));
  const remainingMarkers = openingFence.marker.repeat(Math.max(0, closingFence.length - 3));
  if (name !== undefined) {
    return `${name}${remainingMarkers}`;
  }
  return remainingMarkers || findMochiCardName(lines.slice(closingIndex + 1));
}

function parseMochiFence(line: string): MochiFence | undefined {
  const match = /^\s{0,3}(`{3,}|~{3,})/u.exec(line);
  if (!match) {
    return undefined;
  }
  return { marker: match[1][0] as MochiFence["marker"], length: match[1].length };
}

function cleanMochiNameLine(sourceLine: string, isInFence: boolean): string {
  if (!isInFence && (/^\s{0,3}(?:[-*_]\s*){3,}$/u.test(sourceLine) || /^\s{0,3}(?:=+|-+)\s*$/u.test(sourceLine))) {
    return "";
  }

  let line = sourceLine;
  if (!isInFence) {
    line = line.replace(/^ {4}|^\t/u, "");
  }
  line = line
    .replace(/^\s{0,3}#{1,6}(?:[ \t]+|$)/u, "")
    .replace(/^\s{0,3}>[ \t]?/u, "")
    .replace(/^\s{0,3}(?:[-+*]|\d{1,9}[.)])[ \t]+/u, "")
    .replace(/^\[[ xX]\][ \t]*/u, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, "")
    .replace(/<(?:(?:https?:|mailto:)[^>\s]+)>/giu, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/<[^>\n]*>/gu, "")
    .replace(/\*\*|__|~~|\*/gu, "")
    .replace(/`/gu, "");
  return line;
}
