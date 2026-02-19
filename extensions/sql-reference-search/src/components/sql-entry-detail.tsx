import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useMemo, useState } from "react";
import { DIALECT_LABELS, DIALECT_ORDER, ENTRY_TYPE_LABELS } from "../lib/constants";
import { getExamplesForDialect, getSyntaxForDialect } from "../lib/data";
import { SQLDialect, SQLEntry } from "../types";

type Props = {
  entry: SQLEntry;
  initialDialect: SQLDialect;
};

function section(title: string, body: string): string {
  return `## ${title}\n\n${body}`;
}

export function buildEntryMarkdown(entry: SQLEntry, dialect: SQLDialect, compareDialects: boolean): string {
  const syntax = getSyntaxForDialect(entry, dialect);
  const examples = getExamplesForDialect(entry, dialect);
  const dialectNote = entry.dialects.notes?.[dialect];

  const lines: string[] = [];

  lines.push(`# ${entry.title}`);
  lines.push(`**${ENTRY_TYPE_LABELS[entry.type]}**`);
  lines.push("");
  lines.push(section("Summary", entry.summary));

  if (compareDialects) {
    const allSyntax = DIALECT_ORDER.filter((d) => entry.dialects.supported.includes(d))
      .map((d) => `### ${DIALECT_LABELS[d]}\n\n\`\`\`sql\n${getSyntaxForDialect(entry, d).join("\n")}\n\`\`\``)
      .join("\n\n");
    lines.push("");
    lines.push(section("Syntax (All Dialects)", allSyntax));
  } else {
    lines.push("");
    lines.push(section(`Syntax (${DIALECT_LABELS[dialect]})`, `\`\`\`sql\n${syntax.join("\n")}\n\`\`\``));
  }

  if (entry.parameters && entry.parameters.length > 0) {
    lines.push("");
    lines.push(section("Parameters", entry.parameters.map((item) => `- ${item}`).join("\n")));
  }

  if (examples.length > 0) {
    const renderedExamples = examples.map((ex) => `\`\`\`sql\n${ex}\n\`\`\``).join("\n\n");
    lines.push("");
    lines.push(section("Examples", renderedExamples));
  }

  const noteLines = [...entry.notes];
  if (dialectNote) {
    noteLines.push(`${DIALECT_LABELS[dialect]}: ${dialectNote}`);
  }
  if (noteLines.length > 0) {
    lines.push("");
    lines.push(section("Notes", noteLines.map((note) => `- ${note}`).join("\n")));
  }

  if (entry.related.length > 0) {
    lines.push("");
    lines.push(section("Related", entry.related.map((item) => `- ${item}`).join("\n")));
  }

  return lines.join("\n");
}

export function SqlEntryDetail({ entry, initialDialect }: Props) {
  const [dialect, setDialect] = useState<SQLDialect>(initialDialect);
  const [compareDialects, setCompareDialects] = useState(false);
  const supportedDialects = DIALECT_ORDER.filter((optionDialect) => entry.dialects.supported.includes(optionDialect));

  const markdown = useMemo(
    () => buildEntryMarkdown(entry, dialect, compareDialects),
    [entry, dialect, compareDialects],
  );

  const currentSyntax = getSyntaxForDialect(entry, dialect).join("\n");
  const currentExample = getExamplesForDialect(entry, dialect)[0] ?? "";

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={`Copy ${DIALECT_LABELS[dialect]} Syntax`} content={currentSyntax} />
          {currentExample ? (
            <Action.CopyToClipboard title={`Copy ${DIALECT_LABELS[dialect]} Example`} content={currentExample} />
          ) : null}
          <Action
            title={compareDialects ? "Show Current Dialect Only" : "Compare All Dialects"}
            icon={Icon.Sidebar}
            onAction={() => setCompareDialects((value) => !value)}
          />
          {supportedDialects.map((optionDialect) => (
            <Action
              key={optionDialect}
              title={`View as ${DIALECT_LABELS[optionDialect]}`}
              onAction={() => setDialect(optionDialect)}
              icon={optionDialect === dialect ? Icon.Checkmark : Icon.Circle}
            />
          ))}
        </ActionPanel>
      }
    />
  );
}
