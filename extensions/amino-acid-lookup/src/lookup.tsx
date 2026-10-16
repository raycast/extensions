import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useMemo, useState } from "react";
import {
  AminoAcid,
  Notation,
  ResidueMatch,
  STANDARD_AMINO_ACIDS,
  SequenceConversion,
  findResidues,
  oneToThree,
  peptideMass,
  threeToOne,
} from "./lib/amino-acids";
import { ColorSchemeName, residueHex } from "./lib/color-schemes";

const { Metadata } = List.Item.Detail;

interface Arguments {
  query?: string;
}

interface ColorPreferences {
  colorScheme: ColorSchemeName;
}

/** The residue's colour in the chosen scheme, exactly as defined (Raycast would otherwise darken bright colours). */
function residueColor(aa: AminoAcid): Color.ColorLike {
  const { colorScheme } = getPreferenceValues<ColorPreferences>();
  const hex = residueHex(colorScheme, aa.oneLetter);
  return hex ? { light: hex, dark: hex, adjustContrast: false } : Color.SecondaryText;
}

const NOTATION_LABEL: Record<Notation, string> = {
  oneLetter: "One-Letter Code",
  threeLetter: "Three-Letter Code",
  name: "Name",
};

const NOTATION_SHORTCUT: Record<Notation, Keyboard.Shortcut> = {
  oneLetter: { modifiers: ["cmd"], key: "1" },
  threeLetter: { modifiers: ["cmd"], key: "3" },
  name: Keyboard.Shortcut.Common.CopyName,
};

/**
 * Like a calculator, Enter copies a notation you did NOT type:
 * type "W" → copy "Trp", type "Trp" → copy "W", type "tryptophan" → copy "W".
 */
const COPY_ORDER: Record<Notation, Notation[]> = {
  oneLetter: ["threeLetter", "name", "oneLetter"],
  threeLetter: ["oneLetter", "name", "threeLetter"],
  name: ["oneLetter", "threeLetter", "name"],
};

/**
 * Sequence readings of the query. Three-letter sequences ("Met-Lys") are always tried.
 * A one-letter reading is offered for uppercase input ("MKT"), or for lowercase input
 * only when nothing else matched — otherwise "tryptophan" would also show up as a sequence.
 */
function findSequences(query: string, residueMatches: ResidueMatch[]): SequenceConversion[] {
  const fromThree = threeToOne(query);
  const isUppercase = query === query.toUpperCase();
  const nothingElseMatched = !fromThree && residueMatches.length === 0;
  const fromOne = isUppercase || nothingElseMatched ? oneToThree(query) : undefined;
  return [fromThree, fromOne].filter((s): s is SequenceConversion => s !== undefined);
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const [searchText, setSearchText] = useState(props.arguments?.query ?? props.fallbackText ?? "");
  const query = searchText.trim();

  const residues = useMemo(() => findResidues(query), [query]);
  const sequences = useMemo(() => findSequences(query, residues), [query, residues]);
  // With an empty search, list the 20 standard amino acids as a reference.
  const listed = query === "" ? STANDARD_AMINO_ACIDS.map((aa) => ({ aa, typed: "name" as const })) : residues;

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      isShowingDetail={listed.length + sequences.length > 0}
      searchBarPlaceholder="Type a code, name or sequence: Trp, W, tryptophan, MKTAYIAK…"
    >
      <List.Section title={query === "" ? "Standard Amino Acids" : "Amino Acid"}>
        {listed.map(({ aa, typed }) => (
          <ResidueItem key={aa.threeLetter} aa={aa} typed={typed} />
        ))}
      </List.Section>
      <List.Section title="Sequence">
        {sequences.map((s) => (
          <SequenceItem key={s.direction} conversion={s} />
        ))}
      </List.Section>
      <List.EmptyView
        icon={Icon.QuestionMarkCircle}
        title="No amino acid matches"
        description="Try a one-letter code (W), three-letter code (Trp), name (tryptophan) or a sequence (MKT or Met-Lys-Thr)."
      />
    </List>
  );
}

function ResidueItem({ aa, typed }: { aa: AminoAcid; typed: Notation }) {
  const [primary, ...others] = COPY_ORDER[typed];

  return (
    <List.Item
      title={aa.name}
      subtitle={`${aa.threeLetter} · ${aa.oneLetter}`}
      icon={{ source: Icon.CircleFilled, tintColor: residueColor(aa) }}
      detail={<ResidueDetail aa={aa} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title={`Copy ${NOTATION_LABEL[primary]}`}
              content={aa[primary]}
              shortcut={NOTATION_SHORTCUT[primary]}
            />
            <Action.Paste title={`Paste ${NOTATION_LABEL[primary]}`} content={aa[primary]} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {others.map((notation) => (
              <Action.CopyToClipboard
                key={notation}
                title={`Copy ${NOTATION_LABEL[notation]} (${aa[notation]})`}
                content={aa[notation]}
                shortcut={NOTATION_SHORTCUT[notation]}
              />
            ))}
            {aa.codons && (
              <Action.CopyToClipboard
                title="Copy Codons"
                content={aa.codons.join(", ")}
                shortcut={{ modifiers: ["ctrl"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action title="Change Color Scheme…" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ResidueDetail({ aa }: { aa: AminoAcid }) {
  const oneLetter = aa.oneLetter === "*" ? "\\*" : aa.oneLetter; // "*" is markdown syntax
  const markdown = `# ${aa.name}\n\n## ${aa.threeLetter} · ${oneLetter}`;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <Metadata>
          <Metadata.Label title="Side chain" text={aa.sideChain} />
          {aa.mw !== undefined && <Metadata.Label title="Molecular weight" text={`${aa.mw.toFixed(2)} g/mol`} />}
          {aa.codons && <Metadata.Label title="Codons (DNA)" text={aa.codons.join("  ")} />}
          {aa.synonyms && <Metadata.Label title="Also called" text={aa.synonyms.join(", ")} />}
          {aa.note && <Metadata.Label title="Note" text={aa.note} />}
        </Metadata>
      }
    />
  );
}

function SequenceItem({ conversion }: { conversion: SequenceConversion }) {
  const { direction, input, output, residues } = conversion;
  const toOneLetter = direction === "threeToOne";
  const outputLabel = toOneLetter ? "One-Letter Sequence" : "Three-Letter Sequence";
  const mass = peptideMass(residues);

  const markdown = [
    `### ${toOneLetter ? "Three-letter → one-letter" : "One-letter → three-letter"}`,
    "```\n" + input + "\n```",
    "```\n" + output + "\n```",
  ].join("\n\n");

  return (
    <List.Item
      title={output}
      subtitle={`${residues.length} residues`}
      icon={toOneLetter ? Icon.ArrowRight : Icon.ArrowLeft}
      detail={
        <List.Item.Detail
          markdown={markdown}
          metadata={
            <Metadata>
              <Metadata.Label title="Length" text={`${residues.length} residues`} />
              {mass !== undefined && <Metadata.Label title="Average mass" text={`${mass.toFixed(2)} Da`} />}
            </Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={`Copy ${outputLabel}`} content={output} />
          <Action.Paste title={`Paste ${outputLabel}`} content={output} />
          {!toOneLetter && (
            <Action.CopyToClipboard
              title="Copy Three-Letter Sequence (No Hyphens)"
              content={residues.map((aa) => aa.threeLetter).join("")}
              shortcut={NOTATION_SHORTCUT.threeLetter}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
