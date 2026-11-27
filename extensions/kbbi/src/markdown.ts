import { Entry, Lemma } from "./api";

/** Long lists (e.g. "rumah" has hundreds of compound words) are truncated in the markdown view. */
const MAX_LIST_ITEMS = 30;

function list(title: string, items: string[]): string {
  if (items.length === 0) return "";
  const shown = items.slice(0, MAX_LIST_ITEMS).join(", ");
  const rest = items.length - MAX_LIST_ITEMS;
  const more = rest > 0 ? `, _and ${rest} more_` : "";
  return `**${title}:** ${shown}${more}\n\n`;
}

function entryToMarkdown(entry: Entry): string {
  let md = `## ${entry.entry}\n\n`;

  if (entry.pronunciation) md += `**Pronunciation:** /${entry.pronunciation}/\n\n`;
  if (entry.baseWord) md += `**Base word:** ${entry.baseWord}\n\n`;
  md += list("Non-standard forms", entry.nonStandardWords);
  md += list("Variants", entry.variants);
  md += list("Entry variants", entry.entryVariants);

  if (entry.definitions.length > 0) {
    entry.definitions.forEach((def, index) => {
      const labels = def.labels.map((label) => `\`${label.code}\``).join(" ");
      const text = def.definition || (def.referencedLemma ? `→ **${def.referencedLemma}**` : "");
      md += `${index + 1}. ${labels ? `${labels} ` : ""}${text}\n`;
      def.usageExamples.forEach((example) => {
        md += `    - _${example}_\n`;
      });
    });
    md += "\n";
  } else if (entry.isPrecategorical) {
    md += "_Precategorical: this entry has no meaning on its own until affixes are added._\n\n";
  }

  md += list("Derived words", entry.derivedWords);
  md += list("Compound words", entry.compoundWords);
  md += list("Proverbs", entry.proverbs);
  md += list("Metaphors", entry.metaphors);

  return md;
}

export function lemmaToMarkdown(lemma: Lemma): string {
  return `# ${lemma.lemma}\n\n${lemma.entries.map(entryToMarkdown).join("---\n\n")}`;
}

export function lemmaToPlainText(lemma: Lemma): string {
  return lemma.entries
    .map((entry) => {
      const defs = entry.definitions.map((def, index) => {
        const labels = def.labels.map((label) => label.code).join(" ");
        const text = def.definition || (def.referencedLemma ? `→ ${def.referencedLemma}` : "");
        return `${index + 1}. ${labels ? `${labels} ` : ""}${text}`;
      });
      if (defs.length === 0 && entry.derivedWords.length > 0) {
        defs.push(`Derived words: ${entry.derivedWords.join(", ")}`);
      }
      return [entry.entry, ...defs].join("\n");
    })
    .join("\n\n");
}

/** Label legend shown in the metadata panel, deduplicated across all entries. */
export function uniqueLabels(lemma: Lemma) {
  const seen = new Map<string, { code: string; name: string; kind: string }>();
  for (const entry of lemma.entries) {
    for (const def of entry.definitions) {
      for (const label of def.labels) {
        if (!seen.has(label.code)) seen.set(label.code, label);
      }
    }
  }
  return [...seen.values()];
}
