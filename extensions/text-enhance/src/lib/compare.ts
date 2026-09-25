type Word = { text: string; space: string };

const MAX_WORD_PAIRS = 400_000;

export function renderComparison(original: string, result: string): string {
  const before = tokenize(original);
  const after = tokenize(result);
  const changes =
    before.length * after.length <= MAX_WORD_PAIRS
      ? renderChanges(before, after)
      : "This draft is too long for highlighted changes. Review the full texts below.";

  return [
    "# Compare with Original",
    "",
    "**Bold** text was added. ~~Struck-through~~ text was removed.",
    "",
    "## Changes",
    "",
    changes,
    "",
    "## Original",
    "",
    fencedText(original),
    "",
    "## Enhanced",
    "",
    fencedText(result),
  ].join("\n");
}

function tokenize(text: string): Word[] {
  return [...text.matchAll(/(\S+)(\s*)/g)].map((match) => ({
    text: match[1],
    space: match[2],
  }));
}

function renderChanges(before: Word[], after: Word[]): string {
  if (before.length === 0 && after.length === 0) return "No text to compare.";
  const width = after.length + 1;
  const lengths = new Uint16Array((before.length + 1) * width);
  const at = (i: number, j: number) => i * width + j;

  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      lengths[at(i, j)] =
        before[i].text === after[j].text
          ? lengths[at(i + 1, j + 1)] + 1
          : Math.max(lengths[at(i + 1, j)], lengths[at(i, j + 1)]);
    }
  }

  let i = 0;
  let j = 0;
  const parts: string[] = [];
  while (i < before.length || j < after.length) {
    if (
      i < before.length &&
      j < after.length &&
      before[i].text === after[j].text
    ) {
      parts.push(formatWord(after[j]));
      i++;
      j++;
    } else if (
      i < before.length &&
      (j === after.length || lengths[at(i + 1, j)] >= lengths[at(i, j + 1)])
    ) {
      parts.push(
        `~~${escapeMarkdown(before[i].text)}~~${formatSpace(before[i].space)}`,
      );
      i++;
    } else {
      parts.push(
        `**${escapeMarkdown(after[j].text)}**${formatSpace(after[j].space)}`,
      );
      j++;
    }
  }
  return parts.join("") || "No wording changes.";
}

function formatWord(word: Word): string {
  return escapeMarkdown(word.text) + formatSpace(word.space);
}

function formatSpace(space: string): string {
  return space.replace(/\n/g, "  \n");
}

function escapeMarkdown(text: string): string {
  const special = "\\`*_{}[]()#+-.!>|~";
  return [...text]
    .map((character) =>
      special.includes(character) ? `\\${character}` : character,
    )
    .join("");
}

function fencedText(text: string): string {
  let longestFence = 3;
  for (const match of text.matchAll(/`+/g)) {
    longestFence = Math.max(longestFence, match[0].length + 1);
  }
  const fence = "`".repeat(longestFence);
  return `${fence}text\n${text}\n${fence}`;
}
