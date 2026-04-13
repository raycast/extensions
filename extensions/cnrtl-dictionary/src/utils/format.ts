import type {
  DefinitionEntry,
  EtymologyEntry,
  MorphologyEntry,
  SynonymResult,
} from "./types";
import { DEGREE_DOTS, DEGREE_LABELS } from "./constants";

// ─── Definition → Markdown ────────────────────────────────────────────────────

/**
 * Convert a {@link DefinitionEntry} to Raycast-flavoured Markdown.
 */
export function formatDefinitionMarkdown(entry: DefinitionEntry): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${entry.word}`);
  if (entry.partOfSpeech) lines.push(`*${entry.partOfSpeech}*`);
  if (entry.variants && entry.variants.length > 0) {
    lines.push(`> Variantes : ${entry.variants.join(", ")}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  if (entry.sections.length === 0) {
    lines.push(entry.rawText || "*Aucune définition disponible.*");
    return lines.join("\n");
  }

  for (const section of entry.sections) {
    // Section heading
    const heading =
      section.qualifier
        ? `## ${section.label}. ${section.qualifier}`
        : `## ${section.label}.`;
    lines.push(heading);
    lines.push("");

    if (section.text) {
      lines.push(section.text);
      lines.push("");
    }

    // Sub-sections
    for (const sub of section.subSections) {
      lines.push(`**${sub.label}** ${sub.text}`);
      for (const ex of sub.examples) {
        lines.push(`> *${ex.text}*`);
      }
      lines.push("");
    }

    // Examples at section level
    if (section.subSections.length === 0) {
      for (const ex of section.examples) {
        lines.push(`> *${ex.text}*`);
      }
      if (section.examples.length > 0) lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  lines.push(`[Consulter sur le CNRTL](${entry.url})`);

  return lines.join("\n");
}

/**
 * Convert a {@link DefinitionEntry} to plain text suitable for clipboard.
 */
export function formatDefinitionPlainText(entry: DefinitionEntry): string {
  const parts = [entry.word];
  if (entry.partOfSpeech) parts.push(`(${entry.partOfSpeech})`);
  parts.push("");

  for (const section of entry.sections) {
    parts.push(`${section.label}. ${section.text}`);
    for (const ex of section.examples) {
      parts.push(`  Ex. : ${ex.text}`);
    }
  }

  return parts.join("\n");
}

// ─── Etymology → Markdown ─────────────────────────────────────────────────────

export function formatEtymologyMarkdown(entry: EtymologyEntry, word: string): string {
  const lines: string[] = [];

  lines.push(`# Étymologie de *${word}*`);
  lines.push("");

  if (entry.period || entry.origin) {
    const meta: string[] = [];
    if (entry.period) meta.push(`**Période :** ${entry.period}`);
    if (entry.origin) meta.push(`**Origine :** ${entry.origin}`);
    lines.push(meta.join("  \n"));
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  lines.push(entry.content || "*Aucune information étymologique disponible.*");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`[Consulter sur le CNRTL](${entry.url})`);

  return lines.join("\n");
}

// ─── Synonym/Antonym → List items ─────────────────────────────────────────────

export interface SynonymListItem {
  /** Display title in the List.Item */
  title: string;
  /** Subtitle showing degree */
  subtitle: string;
  /** Accessible description */
  accessory: string;
  word: string;
  url: string;
}

export function formatSynonymItems(result: SynonymResult): SynonymListItem[] {
  const items: SynonymListItem[] = [];

  for (const group of result.groups) {
    for (const entry of group.entries) {
      const dots = entry.degree ? DEGREE_DOTS[entry.degree] ?? "" : "";
      const label = entry.degree ? DEGREE_LABELS[entry.degree] ?? "" : "";
      const domainSuffix = entry.domain ? ` [${entry.domain}]` : "";

      items.push({
        title: entry.word,
        subtitle: dots ? `${dots}  ${label}${domainSuffix}` : domainSuffix,
        accessory: group.label ?? "",
        word: entry.word,
        url: entry.url,
      });
    }
  }

  return items;
}

/**
 * Generate a plain-text list of synonyms for clipboard.
 */
export function formatSynonymPlainText(result: SynonymResult): string {
  return result.groups
    .flatMap((g) => g.entries.map((e) => e.word))
    .join(", ");
}

// ─── Morphology → Markdown ────────────────────────────────────────────────────

export function formatMorphologyMarkdown(entry: MorphologyEntry): string {
  const lines: string[] = [];

  lines.push(`# Morphologie de *${entry.word}*`);
  if (entry.category) lines.push(`*${entry.category}*`);
  lines.push("");

  if (entry.forms.length === 0) {
    lines.push("*Aucune forme morphologique disponible.*");
  } else {
    // Table
    lines.push("| Forme | Valeur |");
    lines.push("| ----- | ------ |");
    for (const form of entry.forms) {
      lines.push(`| ${form.label} | **${form.form}** |`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`[Consulter sur le CNRTL](${entry.url})`);

  return lines.join("\n");
}

// ─── Error → Markdown ─────────────────────────────────────────────────────────

export function formatErrorMarkdown(message: string, word: string, url: string): string {
  return [
    `# Aucun résultat pour *${word}*`,
    "",
    message,
    "",
    "---",
    "",
    `[Rechercher « ${word} » sur le CNRTL](${url})`,
  ].join("\n");
}
