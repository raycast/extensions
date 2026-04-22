import type { EntryResult, Sense, DefinitionPart } from "../types";

function stripMwMarkup(text: string) {
  return text
    .replace(/\{ldquo\}/g, '"')
    .replace(/\{rdquo\}/g, '"')
    .replace(/\{\/?(?:bc|it|bxic|bx|dx|dxt|ma|mat|sx|sr|sound|sup|inf|ph|dx_def|dx_et)\}/g, "")
    .replace(/\{[^}]*\}/g, "");
}

function mwToMarkdown(text: string) {
  return text
    .replace(/\{ldquo\}/g, '"')
    .replace(/\{rdquo\}/g, '"')
    .replace(/\{it\}/g, "*")
    .replace(/\{\/it\}/g, "*")
    .replace(/\{bxic\}/g, "**")
    .replace(/\{\/bxic\}/g, "**")
    .replace(/\{bx\}/g, "**")
    .replace(/\{\/bx\}/g, "**")
    .replace(/\{sup\}/g, "^")
    .replace(/\{\/sup\}/g, "")
    .replace(/\{inf\}/g, "_")
    .replace(/\{\/inf\}/g, "_")
    .replace(/\{bc\}/g, ": ")
    .replace(/\{[^}]*\}/g, "");
}

function formatPartMarkdown(part: DefinitionPart, indent: string): string {
  const lines: string[] = [];

  if (part.text) {
    lines.push(`${indent}${mwToMarkdown(part.text)}`);
  }

  for (const example of part.examples) {
    lines.push(`${indent}  - ${mwToMarkdown(example)}`);
  }

  return lines.join("\n");
}

function formatSenseMarkdown(sense: Sense): string {
  const lines: string[] = [];
  const labelPrefix = sense.label ? `*${sense.label}* ` : "";

  const first = sense.parts[0];
  const firstText = first.text ? mwToMarkdown(first.text) : "";
  lines.push(`${sense.number}. ${labelPrefix}${firstText}`);
  for (const example of first.examples) {
    lines.push(`   - ${mwToMarkdown(example)}`);
  }

  for (let i = 1; i < sense.parts.length; i++) {
    const part = sense.parts[i];
      lines.push("", `   ${mwToMarkdown(part.text)}`);
    for (const example of part.examples) {
      lines.push(`   - ${mwToMarkdown(example)}`);
    }
  }

  return lines.join("\n");
}

function formatSensePlainText(sense: Sense): string {
  const lines: string[] = [];
  const labelPrefix = sense.label ? `${sense.label} ` : "";

  for (const part of sense.parts) {
    const text = part.text ? stripMwMarkup(part.text) : "";
    lines.push(`${sense.number}. ${labelPrefix}${text}`);
    for (const example of part.examples) {
      lines.push(`  - ${stripMwMarkup(example)}`);
    }
  }

  return lines.join("\n");
}

export function formatEntryMarkdown(entry: EntryResult) {
  const heading = entry.partOfSpeech ? `# ${entry.headword} — ${entry.partOfSpeech}` : `# ${entry.headword}`;
  const lines = [heading];

  if (entry.pronunciation) {
    lines.push(`**Pronunciation:** ${entry.pronunciation}`);
  }

  if (entry.senses.length > 0) {
    lines.push("");
    for (const sense of entry.senses) {
      lines.push(formatSenseMarkdown(sense));
    }
  }

  return lines.join("\n");
}

export function formatEntriesMarkdown(entries: EntryResult[]) {
  if (entries.length === 0) return "";
  if (entries.length === 1) return formatEntryMarkdown(entries[0]);

  return entries
    .map((entry, i) => {
      const md = formatEntryMarkdown(entry);
      return i === 0 ? md : `\n---\n\n${md}`;
    })
    .join("");
}

export function formatEntryPlainText(entry: EntryResult) {
  const heading = entry.partOfSpeech ? `${entry.headword} (${entry.partOfSpeech})` : entry.headword;
  const sections: string[] = [heading];

  if (entry.senses.length > 0) {
    for (const sense of entry.senses) {
      sections.push(formatSensePlainText(sense));
    }
  }

  return sections.join("\n").trim();
}

export function formatEntriesPlainText(entries: EntryResult[]) {
  return entries.map((entry) => formatEntryPlainText(entry)).join("\n\n");
}
