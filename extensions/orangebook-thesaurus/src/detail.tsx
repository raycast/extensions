import { Clipboard, List, showHUD } from "@raycast/api";
import type { RelevanceGroup, ThesaurusEntry } from "./api";

export function EntryDetail({ entry }: { entry: ThesaurusEntry }) {
  return <List.Item.Detail markdown={entryMarkdown(entry)} />;
}

export async function copyText(value: string): Promise<void> {
  await Clipboard.copy(value);
  await showHUD(value.length > 48 ? "Copied" : `Copied ${value}`);
}

function entryMarkdown(entry: ThesaurusEntry): string {
  const lines: string[] = [
    `**${inline(entry.word)}**${entry.partOfSpeech ? ` *${inline(entry.partOfSpeech)}*` : ""}`,
    "",
  ];

  if (entry.definitions.length > 0) {
    const definitions = entry.definitions.map((definition, index) => {
      const text = inline(definition);
      return entry.definitions.length > 1 ? `**${index + 1}.** ${text}` : text;
    });
    lines.push(definitions.join("  \n"), "");
  }

  const groups = relevanceGroups(entry);
  if (groups.length > 0) lines.push("---", "");

  groups.forEach((group) => {
    const chips = group.words.map((word) => `\`${code(word)}\``).join("  ");
    lines.push(group.label ? `**${inline(group.label)}**  \n${chips}` : chips, "");
  });

  return lines.join("\n").trim();
}

function relevanceGroups(entry: ThesaurusEntry): RelevanceGroup[] {
  const synonyms = arrayGroups(entry.synonymGroups, entry.synonyms, "Synonyms");
  const antonyms = arrayGroups(entry.antonymGroups, entry.antonyms, "Antonyms");
  return [...synonyms, ...antonyms];
}

function arrayGroups(
  groups: RelevanceGroup[] | undefined,
  words: string[] | undefined,
  label: string,
): RelevanceGroup[] {
  if (Array.isArray(groups) && groups.length > 0) return groups;
  if (Array.isArray(words) && words.length > 0) return [{ label, words }];
  return [];
}

function inline(value: string): string {
  return value.replace(/[*_`[\]]/g, "\\$&");
}

function code(value: string): string {
  return value.replace(/`/g, "'");
}
