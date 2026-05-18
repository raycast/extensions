import { Action, ActionPanel, Color, Icon, LaunchProps, List } from "@raycast/api";
import { useMemo, useState } from "react";

type Hydropathy = "Hydrophobic" | "Hydrophilic";
type AcidBaseClass = "Acidic" | "Basic" | "Neutral";
type ChargeClass = "Negative" | "Neutral" | "Positive" | "Mostly neutral / weakly positive";
type PolarityClass = "Nonpolar" | "Polar acidic" | "Polar basic" | "Polar uncharged";

type AminoAcid = {
  name: string;
  threeLetter: string;
  oneLetter: string;
  structureImage: string;
  hydropathy: Hydropathy;
  acidBase: AcidBaseClass;
  chargeAtPhysiologicalPH: ChargeClass;
  polarity: PolarityClass;
  codonsRna: string[];
  pI: number;
  pKaAlphaCOOH: number;
  pKaAlphaNH3: number;
  pKaSideChain?: number;
  aliases?: string[];
};

const AMINO_ACIDS: AminoAcid[] = [
  {
    name: "Alanine",
    threeLetter: "Ala",
    oneLetter: "A",
    structureImage: "amino-acids-compact/alanine-compact.svg",
    hydropathy: "Hydrophobic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Nonpolar",
    codonsRna: ["GCU", "GCC", "GCA", "GCG"],
    pI: 6.01,
    pKaAlphaCOOH: 2.35,
    pKaAlphaNH3: 9.87,
  },
  {
    name: "Arginine",
    threeLetter: "Arg",
    oneLetter: "R",
    structureImage: "amino-acids-compact/arginine-compact.svg",
    hydropathy: "Hydrophilic",
    acidBase: "Basic",
    chargeAtPhysiologicalPH: "Positive",
    polarity: "Polar basic",
    codonsRna: ["CGU", "CGC", "CGA", "CGG", "AGA", "AGG"],
    pI: 10.76,
    pKaAlphaCOOH: 2.17,
    pKaAlphaNH3: 9.04,
    pKaSideChain: 12.48,
  },
  {
    name: "Asparagine",
    threeLetter: "Asn",
    oneLetter: "N",
    structureImage: "amino-acids-compact/asparagine-compact.svg",
    hydropathy: "Hydrophilic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Polar uncharged",
    codonsRna: ["AAU", "AAC"],
    pI: 5.41,
    pKaAlphaCOOH: 2.02,
    pKaAlphaNH3: 8.80,
  },
  {
    name: "Aspartic acid",
    threeLetter: "Asp",
    oneLetter: "D",
    structureImage: "amino-acids-compact/aspartic-acid-compact.svg",
    hydropathy: "Hydrophilic",
    acidBase: "Acidic",
    chargeAtPhysiologicalPH: "Negative",
    polarity: "Polar acidic",
    codonsRna: ["GAU", "GAC"],
    pI: 2.98,
    pKaAlphaCOOH: 2.09,
    pKaAlphaNH3: 9.82,
    pKaSideChain: 3.86,
    aliases: ["Aspartate"],
  },
  {
    name: "Cysteine",
    threeLetter: "Cys",
    oneLetter: "C",
    structureImage: "amino-acids-compact/cysteine-compact.svg",
    hydropathy: "Hydrophilic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Polar uncharged",
    codonsRna: ["UGU", "UGC"],
    pI: 5.02,
    pKaAlphaCOOH: 1.96,
    pKaAlphaNH3: 10.28,
    pKaSideChain: 8.33,
  },
  {
    name: "Glutamic acid",
    threeLetter: "Glu",
    oneLetter: "E",
    structureImage: "amino-acids-compact/glutamic-acid-compact.svg",
    hydropathy: "Hydrophilic",
    acidBase: "Acidic",
    chargeAtPhysiologicalPH: "Negative",
    polarity: "Polar acidic",
    codonsRna: ["GAA", "GAG"],
    pI: 3.22,
    pKaAlphaCOOH: 2.19,
    pKaAlphaNH3: 9.67,
    pKaSideChain: 4.25,
    aliases: ["Glutamate"],
  },
  {
    name: "Glutamine",
    threeLetter: "Gln",
    oneLetter: "Q",
    structureImage: "amino-acids-compact/glutamine-compact.svg",
    hydropathy: "Hydrophilic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Polar uncharged",
    codonsRna: ["CAA", "CAG"],
    pI: 5.65,
    pKaAlphaCOOH: 2.17,
    pKaAlphaNH3: 9.13,
  },
  {
    name: "Glycine",
    threeLetter: "Gly",
    oneLetter: "G",
    structureImage: "amino-acids-compact/glycine-compact.svg",
    hydropathy: "Hydrophobic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Nonpolar",
    codonsRna: ["GGU", "GGC", "GGA", "GGG"],
    pI: 6.06,
    pKaAlphaCOOH: 2.34,
    pKaAlphaNH3: 9.60,
  },
  {
    name: "Histidine",
    threeLetter: "His",
    oneLetter: "H",
    structureImage: "amino-acids-compact/histidine-compact.svg",
    hydropathy: "Hydrophilic",
    acidBase: "Basic",
    chargeAtPhysiologicalPH: "Mostly neutral / weakly positive",
    polarity: "Polar basic",
    codonsRna: ["CAU", "CAC"],
    pI: 7.59,
    pKaAlphaCOOH: 1.82,
    pKaAlphaNH3: 9.17,
    pKaSideChain: 6.0,
  },
  {
    name: "Isoleucine",
    threeLetter: "Ile",
    oneLetter: "I",
    structureImage: "amino-acids-compact/isoleucine-compact.svg",
    hydropathy: "Hydrophobic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Nonpolar",
    codonsRna: ["AUU", "AUC", "AUA"],
    pI: 6.02,
    pKaAlphaCOOH: 2.36,
    pKaAlphaNH3: 9.68,
  },
  {
    name: "Leucine",
    threeLetter: "Leu",
    oneLetter: "L",
    structureImage: "amino-acids-compact/leucine-compact.svg",
    hydropathy: "Hydrophobic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Nonpolar",
    codonsRna: ["UUA", "UUG", "CUU", "CUC", "CUA", "CUG"],
    pI: 5.98,
    pKaAlphaCOOH: 2.36,
    pKaAlphaNH3: 9.60,
  },
  {
    name: "Lysine",
    threeLetter: "Lys",
    oneLetter: "K",
    structureImage: "amino-acids-compact/lysine-compact.svg",
    hydropathy: "Hydrophilic",
    acidBase: "Basic",
    chargeAtPhysiologicalPH: "Positive",
    polarity: "Polar basic",
    codonsRna: ["AAA", "AAG"],
    pI: 9.74,
    pKaAlphaCOOH: 2.18,
    pKaAlphaNH3: 8.95,
    pKaSideChain: 10.5,
  },
  {
    name: "Methionine",
    threeLetter: "Met",
    oneLetter: "M",
    structureImage: "amino-acids-compact/methionine-compact.svg",
    hydropathy: "Hydrophobic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Nonpolar",
    codonsRna: ["AUG"],
    pI: 5.74,
    pKaAlphaCOOH: 2.28,
    pKaAlphaNH3: 9.21,
  },
  {
    name: "Phenylalanine",
    threeLetter: "Phe",
    oneLetter: "F",
    structureImage: "amino-acids-compact/phenylalanine-compact.svg",
    hydropathy: "Hydrophobic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Nonpolar",
    codonsRna: ["UUU", "UUC"],
    pI: 5.48,
    pKaAlphaCOOH: 2.20,
    pKaAlphaNH3: 9.31,
  },
  {
    name: "Proline",
    threeLetter: "Pro",
    oneLetter: "P",
    structureImage: "amino-acids-compact/proline-compact.svg",
    hydropathy: "Hydrophobic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Nonpolar",
    codonsRna: ["CCU", "CCC", "CCA", "CCG"],
    pI: 6.30,
    pKaAlphaCOOH: 1.99,
    pKaAlphaNH3: 10.64,
  },
  {
    name: "Serine",
    threeLetter: "Ser",
    oneLetter: "S",
    structureImage: "amino-acids-compact/serine-compact.svg",
    hydropathy: "Hydrophilic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Polar uncharged",
    codonsRna: ["UCU", "UCC", "UCA", "UCG", "AGU", "AGC"],
    pI: 5.68,
    pKaAlphaCOOH: 2.21,
    pKaAlphaNH3: 9.15,
  },
  {
    name: "Threonine",
    threeLetter: "Thr",
    oneLetter: "T",
    structureImage: "amino-acids-compact/threonine-compact.svg",
    hydropathy: "Hydrophilic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Polar uncharged",
    codonsRna: ["ACU", "ACC", "ACA", "ACG"],
    pI: 5.60,
    pKaAlphaCOOH: 2.09,
    pKaAlphaNH3: 9.10,
  },
  {
    name: "Tryptophan",
    threeLetter: "Trp",
    oneLetter: "W",
    structureImage: "amino-acids-compact/tryptophan-compact.svg",
    hydropathy: "Hydrophobic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Nonpolar",
    codonsRna: ["UGG"],
    pI: 5.89,
    pKaAlphaCOOH: 2.38,
    pKaAlphaNH3: 9.39,
  },
  {
    name: "Tyrosine",
    threeLetter: "Tyr",
    oneLetter: "Y",
    structureImage: "amino-acids-compact/tyrosine-compact.svg",
    hydropathy: "Hydrophilic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Polar uncharged",
    codonsRna: ["UAU", "UAC"],
    pI: 5.66,
    pKaAlphaCOOH: 2.20,
    pKaAlphaNH3: 9.21,
    pKaSideChain: 10.1,
  },
  {
    name: "Valine",
    threeLetter: "Val",
    oneLetter: "V",
    structureImage: "amino-acids-compact/valine-compact.svg",
    hydropathy: "Hydrophobic",
    acidBase: "Neutral",
    chargeAtPhysiologicalPH: "Neutral",
    polarity: "Nonpolar",
    codonsRna: ["GUU", "GUC", "GUA", "GUG"],
    pI: 5.96,
    pKaAlphaCOOH: 2.32,
    pKaAlphaNH3: 9.74,
  },
];

function rnaToDna(codon: string): string {
  return codon.replace(/U/g, "T");
}

function buildMarkdown(aa: AminoAcid): string {
  const dnaCodons = aa.codonsRna.map(rnaToDna);
  const lines: string[] = [];

  lines.push(`# ${aa.name} (${aa.threeLetter}, ${aa.oneLetter})`);
  lines.push("");
  lines.push(`![${aa.name} structure](${aa.structureImage}?raycast-width=300&raycast-height=184&v=compact-2)`);
  lines.push("");
  lines.push("## Classification");
  lines.push("");
  lines.push(`**Hydropathy**: ${aa.hydropathy}`);
  lines.push(`**Polarity**: ${aa.polarity}`);
  lines.push(`**Acid/base class**: ${aa.acidBase}`);
  lines.push(`**Charge at physiological pH**: ${aa.chargeAtPhysiologicalPH}`);
  lines.push("");
  lines.push("## Biochemical Values");
  lines.push("");
  lines.push(`**pI**: ${aa.pI.toFixed(2)}`);
  lines.push("");
  lines.push(`**pKa (α-COOH)**: ${aa.pKaAlphaCOOH.toFixed(2)}`);
  lines.push(`**pKa (α-NH₃⁺)**: ${aa.pKaAlphaNH3.toFixed(2)}`);

  if (aa.pKaSideChain !== undefined) {
    lines.push(`**pKa (side chain)**: ${aa.pKaSideChain.toFixed(2)}`);
  }

  lines.push("");
  lines.push(`**Codons (RNA)**: \`${aa.codonsRna.join(", ")}\``);
  lines.push(`**Codons (DNA)**: \`${dnaCodons.join(", ")}\``);

  if (aa.aliases && aa.aliases.length > 0) {
    lines.push("");
    lines.push(`**Aliases**: ${aa.aliases.join(", ")}`);
  }

  return lines.join("\n");
}

function hydropathyColor(hydropathy: Hydropathy): Color {
  return hydropathy === "Hydrophobic" ? Color.Orange : Color.Blue;
}

function chargeColor(charge: ChargeClass): Color {
  if (charge === "Positive") return Color.Green;
  if (charge === "Negative") return Color.Red;
  if (charge === "Mostly neutral / weakly positive") return Color.Yellow;

  return Color.SecondaryText;
}

function acidBaseColor(acidBase: AcidBaseClass): Color {
  if (acidBase === "Acidic") return Color.Red;
  if (acidBase === "Basic") return Color.Green;

  return Color.SecondaryText;
}

function buildMetadata(aa: AminoAcid) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.TagList title="Classification">
        <List.Item.Detail.Metadata.TagList.Item text={aa.hydropathy} color={hydropathyColor(aa.hydropathy)} />
        <List.Item.Detail.Metadata.TagList.Item text={aa.polarity} color={Color.Purple} />
        <List.Item.Detail.Metadata.TagList.Item text={aa.acidBase} color={acidBaseColor(aa.acidBase)} />
        <List.Item.Detail.Metadata.TagList.Item
          text={aa.chargeAtPhysiologicalPH}
          color={chargeColor(aa.chargeAtPhysiologicalPH)}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Hydropathy" text={aa.hydropathy} />
      <List.Item.Detail.Metadata.Label title="Polarity" text={aa.polarity} />
      <List.Item.Detail.Metadata.Label title="Acid/Base" text={aa.acidBase} />
      <List.Item.Detail.Metadata.Label title="Charge at pH 7" text={aa.chargeAtPhysiologicalPH} />
    </List.Item.Detail.Metadata>
  );
}

// --- scoring for “most likely” match --------------------------------

function scoreAminoAcid(aa: AminoAcid, query: string): number {
  const raw = query.trim();
  if (!raw) return 1; // neutral baseline so everything shows when empty

  const qUpper = raw.toUpperCase();
  const qLower = raw.toLowerCase();
  let score = 0;

  // Highest priority: exact 1-letter code
  if (raw.length === 1 && qUpper === aa.oneLetter.toUpperCase()) {
    score = Math.max(score, 100);
  }

  // Exact 3-letter code (e.g. "Phe" → Phenylalanine, "Asp" → Aspartic acid)
  if (raw.length === 3 && qUpper === aa.threeLetter.toUpperCase()) {
    score = Math.max(score, 90);
  }

  // Exact full name / alias
  if (qLower === aa.name.toLowerCase()) {
    score = Math.max(score, 80);
  }
  if (aa.aliases?.some((a) => a.toLowerCase() === qLower)) {
    score = Math.max(score, 80);
  }

  // Exact codon (RNA or DNA)
  const dnaCodons = aa.codonsRna.map(rnaToDna);
  if (aa.codonsRna.some((c) => c.toUpperCase() === qUpper) || dnaCodons.some((c) => c.toUpperCase() === qUpper)) {
    score = Math.max(score, 70);
  }

  // Starts-with matches
  if (aa.threeLetter.toUpperCase().startsWith(qUpper)) {
    score = Math.max(score, 65);
  }
  if (aa.name.toLowerCase().startsWith(qLower)) {
    score = Math.max(score, 60);
  }
  if (aa.aliases?.some((a) => a.toLowerCase().startsWith(qLower))) {
    score = Math.max(score, 60);
  }

  // Substring matches in name / aliases
  if (aa.name.toLowerCase().includes(qLower)) {
    score = Math.max(score, 40);
  }
  if (aa.aliases?.some((a) => a.toLowerCase().includes(qLower))) {
    score = Math.max(score, 30);
  }

  return score;
}

// --- Command --------------------------------------------------------

interface CommandArguments {
  query?: string;
}

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const initialQuery = props.arguments?.query ?? "";
  const [searchText, setSearchText] = useState(initialQuery);

  const filteredAminoAcids = useMemo(() => {
    const q = searchText.trim();
    if (!q) {
      // No search text: show everything sorted alphabetically
      return [...AMINO_ACIDS].sort((a, b) => a.name.localeCompare(b.name));
    }

    const scored = AMINO_ACIDS.map((aa) => ({
      aa,
      score: scoreAminoAcid(aa, q),
    }));

    const relevant = scored.filter((item) => item.score > 0);

    if (relevant.length === 0) {
      // If nothing scored, fall back to full list
      return [...AMINO_ACIDS].sort((a, b) => a.name.localeCompare(b.name));
    }

    relevant.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.aa.name.localeCompare(b.aa.name);
    });

    return relevant.map((item) => item.aa);
  }, [searchText]);

  return (
    <List
      navigationTitle="Amino Acid Lookup Tool"
      searchBarPlaceholder="Search by name, 1/3-letter code, or codon…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false} // we handle filtering & ranking ourselves
      isShowingDetail
    >
      {filteredAminoAcids.map((aa) => {
        const dnaCodons = aa.codonsRna.map(rnaToDna);

        const keywords = [
          aa.name,
          aa.threeLetter,
          aa.oneLetter,
          aa.hydropathy,
          aa.acidBase,
          aa.chargeAtPhysiologicalPH,
          aa.polarity,
          ...(aa.aliases ?? []),
          ...aa.codonsRna,
          ...dnaCodons,
        ];

        return (
          <List.Item
            key={aa.name}
            title={aa.name}
            subtitle={`${aa.threeLetter} (${aa.oneLetter})`}
            icon={{ source: Icon.Circle, tintColor: hydropathyColor(aa.hydropathy) }}
            accessories={[{ tag: aa.acidBase }, { text: aa.chargeAtPhysiologicalPH }]}
            keywords={keywords}
            detail={<List.Item.Detail markdown={buildMarkdown(aa)} metadata={buildMetadata(aa)} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Info as Markdown" content={buildMarkdown(aa)} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
