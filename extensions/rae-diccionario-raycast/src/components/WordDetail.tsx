// src/components/WordDetail.tsx
import { ActionPanel, Action, Detail } from "@raycast/api";
import {
  WordEntry,
  Meaning,
  Definition,
  Conjugation,
  Conjugations,
  ConjugationIndicative,
  ConjugationSubjunctive,
  ConjugationImperative,
  ConjugationNonPersonal,
} from "../api/rae";

interface WordDetailProps {
  wordEntry: WordEntry;
  showActions?: boolean;
}

function renderOrigin(meaning: Meaning) {
  if (!meaning.origin) return "";
  return `**Origen:** ${meaning.origin.text || meaning.origin.raw}\n\n`;
}

function renderDefinitions(senses: Definition[]) {
  return senses
    .map((sense) => {
      const category = sense.category ? `*${sense.category}*` : "";
      const usage = sense.usage && sense.usage !== "common" ? ` (${sense.usage})` : "";
      const synonyms = sense.synonyms && sense.synonyms.length > 0 ? `\n_Sinónimos_: ${sense.synonyms.join(", ")}` : "";
      const antonyms = sense.antonyms && sense.antonyms.length > 0 ? `\n_Antónimos_: ${sense.antonyms.join(", ")}` : "";
      return `${category} ${sense.meaning_number}. ${sense.description}${usage}${synonyms}${antonyms}`;
    })
    .join("\n\n");
}

function renderNonPersonal(nonPersonal: ConjugationNonPersonal) {
  return (
    `### Formas no personales\n` +
    `| Infinitivo | Participio | Gerundio | Infinitivo compuesto | Gerundio compuesto |\n` +
    `|---|---|---|---|---|\n` +
    `| ${nonPersonal.infinitive} | ${nonPersonal.participle} | ${nonPersonal.gerund} | ${nonPersonal.compound_infinitive} | ${nonPersonal.compound_gerund} |\n`
  );
}

function renderConjugationTable(conj: Conjugation) {
  return (
    `| Yo | Tú | Usted | Él/Ella | Nosotros | Vosotros | Ustedes | Ellos/Ellas |\n` +
    `|---|---|---|---|---|---|---|---|\n` +
    `| ${conj.singular_first_person} | ${conj.singular_second_person} | ${conj.singular_formal_second_person} | ${conj.singular_third_person} | ${conj.plural_first_person} | ${conj.plural_second_person} | ${conj.plural_formal_second_person} | ${conj.plural_third_person} |\n`
  );
}

function renderIndicative(indicative: ConjugationIndicative) {
  let md = `### Indicativo\n`;
  for (const [tense, conj] of Object.entries(indicative)) {
    if (!conj) continue;
    md += `**${formatTense(tense)}**\n\n`;
    md += renderConjugationTable(conj);
    md += `\n`;
  }
  return md;
}

function renderSubjunctive(subjunctive: ConjugationSubjunctive) {
  let md = `### Subjuntivo\n`;
  for (const [tense, conj] of Object.entries(subjunctive)) {
    if (!conj) continue;
    md += `**${formatTense(tense)}**\n\n`;
    md += renderConjugationTable(conj);
    md += `\n`;
  }
  return md;
}

function renderImperative(imperative: ConjugationImperative) {
  return (
    `### Imperativo\n` +
    `| Tú | Usted | Vosotros | Ustedes |\n` +
    `|---|---|---|---|\n` +
    `| ${imperative.singular_second_person} | ${imperative.singular_formal_second_person} | ${imperative.plural_second_person} | ${imperative.plural_formal_second_person} |\n`
  );
}

function renderConjugations(conjugations?: Conjugations) {
  if (!conjugations) return "";
  let md = "";
  if (conjugations.non_personal) md += renderNonPersonal(conjugations.non_personal) + "\n";
  if (conjugations.indicative) md += renderIndicative(conjugations.indicative) + "\n";
  if (conjugations.subjunctive) md += renderSubjunctive(conjugations.subjunctive) + "\n";
  if (conjugations.imperative) md += renderImperative(conjugations.imperative) + "\n";
  return md;
}

function formatTense(tense: string) {
  return tense.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function WordDetail({ wordEntry, showActions = true }: WordDetailProps) {
  const meaningsMd = wordEntry.meanings
    .map((meaning, idx) => {
      let md = `## Significado ${idx + 1}\n`;
      md += renderOrigin(meaning);
      md += renderDefinitions(meaning.senses);
      if (meaning.conjugations) {
        md += "\n\n" + renderConjugations(meaning.conjugations);
      }
      return md;
    })
    .join("\n\n---\n\n");

  const markdown = `# ${wordEntry.word}\n\n${meaningsMd}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        showActions ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copiar Palabra"
              content={wordEntry.word}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copiar Definición"
              content={meaningsMd}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
