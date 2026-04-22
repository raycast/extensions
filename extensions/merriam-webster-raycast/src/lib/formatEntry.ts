import type { EntryResult } from "../types";

export function formatEntryMarkdown(entry: EntryResult) {
  const lines = [`# ${entry.headword}`];

  if (entry.partOfSpeech) {
    lines.push(`**Part of speech:** ${entry.partOfSpeech}`);
  }

  if (entry.pronunciation) {
    lines.push(`**Pronunciation:** ${entry.pronunciation}`);
  }

  if (entry.shortDefinitions.length > 0) {
    lines.push("", "## Definitions");

    entry.shortDefinitions.forEach((definition, index) => {
      lines.push(`${index + 1}. ${definition}`);
    });
  }

  if (entry.examples.length > 0) {
    lines.push("", "## Examples");
    entry.examples.forEach((example) => lines.push(`- ${example}`));
  }

  return lines.join("\n");
}

export function formatEntryPlainText(entry: EntryResult) {
  const heading = entry.partOfSpeech ? `${entry.headword} (${entry.partOfSpeech})` : entry.headword;
  const sections: string[] = [heading];

  if (entry.shortDefinitions.length > 0) {
    sections.push(entry.shortDefinitions.map((definition, index) => `${index + 1}. ${definition}`).join("\n"));
  }

  if (entry.examples.length > 0) {
    sections.push(`Examples:\n${entry.examples.map((example) => `- ${example}`).join("\n")}`);
  }

  return sections.join("\n").trim();
}
