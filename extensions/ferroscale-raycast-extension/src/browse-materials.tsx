import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import {
  MATERIAL_GRADES,
  METAL_FAMILIES,
} from "./metal-core/datasets/materials";
import type {
  MaterialGrade,
  MetalFamily,
  MetalFamilyId,
} from "./metal-core/datasets/types";

/* ------------------------------------------------------------------ */
/*  Family display config                                              */
/* ------------------------------------------------------------------ */

const FAMILY_ICONS: Record<MetalFamilyId, { source: Icon; tintColor: Color }> =
  {
    steel: { source: Icon.Building, tintColor: Color.Blue },
    stainless_steel: { source: Icon.Star, tintColor: Color.Purple },
    aluminum: { source: Icon.Circle, tintColor: Color.Orange },
    copper: { source: Icon.Bolt, tintColor: Color.Yellow },
    titanium: { source: Icon.Dot, tintColor: Color.Green },
    cast_iron: { source: Icon.Hammer, tintColor: Color.SecondaryText },
  };

/* ------------------------------------------------------------------ */
/*  Grade detail view                                                  */
/* ------------------------------------------------------------------ */

function GradeDetail({
  grade,
  family,
}: {
  grade: MaterialGrade;
  family: MetalFamily;
}) {
  const kgPerDm3 = (grade.densityKgPerM3 / 1000).toFixed(3);
  const gPerCm3 = (grade.densityKgPerM3 / 1000).toFixed(3);
  const lbPerFt3 = (grade.densityKgPerM3 * 0.0624279606).toFixed(3);

  const markdown = [
    `# ${grade.label}`,
    "",
    `**Family:** ${family.label}  ·  **ID:** \`${grade.id}\``,
    `**Standard:** ${grade.referenceLabel}`,
    "",
    "## Density",
    "",
    "| Unit | Value |",
    "|------|-------|",
    `| kg/m³ | **${grade.densityKgPerM3.toLocaleString()}** |`,
    `| kg/dm³ (g/cm³) | ${kgPerDm3} |`,
    `| g/cm³ | ${gPerCm3} |`,
    `| lb/ft³ | ${lbPerFt3} |`,
    "",
    "## Quick Weight Examples",
    "",
    "Use this material in Quick Metal Weight with:",
    "",
    `\`\`\``,
    `mat=${grade.id}`,
    `\`\`\``,
    "",
    "### Common shortcuts",
    buildShortcutsSection(grade.id),
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle={grade.label}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              content={String(grade.densityKgPerM3)}
              title="Copy Density (Kg/m³)"
              icon={Icon.Gauge}
            />
            <Action.CopyToClipboard
              content={grade.id}
              title="Copy Grade ID"
              icon={Icon.Clipboard}
            />
            <Action.CopyToClipboard
              content={`mat=${grade.id}`}
              title="Copy Mat= Flag"
              icon={Icon.Tag}
            />
            <Action.CopyToClipboard
              content={grade.referenceLabel}
              title="Copy Standard Reference"
              icon={Icon.Book}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Shortcut hints per grade                                           */
/* ------------------------------------------------------------------ */

const GRADE_SHORTCUTS: Record<string, string[]> = {
  "steel-s235jr": ["mat=s235", "mat=s235jr", "mat=steel"],
  "steel-s275jr": ["mat=s275", "mat=s275jr"],
  "steel-s355jr": ["mat=s355", "mat=s355jr"],
  "steel-s420m": ["mat=s420", "mat=s420m"],
  "steel-s460m": ["mat=s460", "mat=s460m"],
  "stainless-304": [
    "mat=304",
    "mat=aisi304",
    "mat=14301",
    "mat=stainless",
    "mat=inox",
  ],
  "stainless-316": ["mat=316", "mat=aisi316", "mat=14401"],
  "stainless-316l": ["mat=316l", "mat=aisi316l", "mat=14404"],
  "stainless-duplex-2205": ["mat=duplex", "mat=2205", "mat=14462"],
  "al-6060": ["mat=alu", "mat=aluminum", "mat=aluminium", "mat=6060"],
  "al-6061": ["mat=6061"],
  "al-6082": ["mat=6082"],
  "al-5754": ["mat=5754"],
  "al-3003": ["mat=3003"],
  "al-7075": ["mat=7075"],
  "cu-c11000": ["mat=copper", "mat=cu"],
  "cu-brass-cw614n": ["mat=brass"],
  "cu-bronze-cw453k": ["mat=bronze"],
  "ti-grade2": ["mat=ti", "mat=titanium", "mat=tigrade2"],
  "ti-grade5": ["mat=tigrade5", "mat=ti6al4v"],
  "ci-gjl-250": ["mat=castiron", "mat=greyiron", "mat=gjl250"],
  "ci-gjl-300": ["mat=gjl300"],
};

function buildShortcutsSection(gradeId: string): string {
  const shortcuts = GRADE_SHORTCUTS[gradeId];
  if (!shortcuts || shortcuts.length === 0) {
    return `\`mat=${gradeId}\` (use full ID)`;
  }
  return shortcuts.map((s) => `- \`${s}\``).join("\n");
}

/* ------------------------------------------------------------------ */
/*  Grade list item                                                    */
/* ------------------------------------------------------------------ */

function GradeItem({
  grade,
  family,
}: {
  grade: MaterialGrade;
  family: MetalFamily;
}) {
  const icon = FAMILY_ICONS[grade.familyId] ?? {
    source: Icon.Dot,
    tintColor: Color.SecondaryText,
  };

  const shortcuts = GRADE_SHORTCUTS[grade.id];
  const shortcutHint =
    shortcuts && shortcuts.length > 0 ? shortcuts[0] : `mat=${grade.id}`;

  return (
    <List.Item
      title={grade.label}
      subtitle={`${grade.densityKgPerM3.toLocaleString()} kg/m³  ·  ${shortcutHint}`}
      icon={icon}
      accessories={[
        { text: grade.referenceLabel, icon: Icon.Book },
        {
          tag: {
            value: `${grade.densityKgPerM3} kg/m³`,
            color:
              grade.densityKgPerM3 > 7000
                ? Color.Blue
                : grade.densityKgPerM3 > 4000
                  ? Color.Purple
                  : Color.Orange,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Info}
            target={<GradeDetail grade={grade} family={family} />}
          />
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              content={String(grade.densityKgPerM3)}
              title="Copy Density (Kg/m³)"
              icon={Icon.Gauge}
            />
            <Action.CopyToClipboard
              content={`mat=${grade.id}`}
              title="Copy Mat= Flag"
              icon={Icon.Tag}
            />
            <Action.CopyToClipboard
              content={grade.id}
              title="Copy Grade ID"
              icon={Icon.Clipboard}
            />
            <Action.CopyToClipboard
              content={`dens=${grade.densityKgPerM3}`}
              title="Copy Dens= Flag"
              icon={Icon.Gauge}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main command                                                       */
/* ------------------------------------------------------------------ */

export function BrowseMaterialsView() {
  return (
    <List
      navigationTitle="Browse Materials"
      searchBarPlaceholder="Search materials and grades…"
    >
      {METAL_FAMILIES.map((family) => {
        const grades = MATERIAL_GRADES.filter((g) => g.familyId === family.id);
        if (grades.length === 0) return null;

        return (
          <List.Section
            key={family.id}
            title={family.label}
            subtitle={`${family.referenceLabel}  ·  ${grades.length} grade${grades.length !== 1 ? "s" : ""}`}
          >
            {grades.map((grade) => (
              <GradeItem key={grade.id} grade={grade} family={family} />
            ))}
          </List.Section>
        );
      })}

      <List.Section title="Usage">
        <List.Item
          title="Use mat= flag in Quick Metal Weight"
          subtitle="e.g.  ipe 200x6000 mat=s355  or  rb 30x6000 mat=cu"
          icon={{ source: Icon.LightBulb, tintColor: Color.Yellow }}
          accessories={[{ text: "Quick Metal Weight" }]}
        />
        <List.Item
          title="Use dens= for a fully custom density"
          subtitle="e.g.  rb 30x6000 dens=8960"
          icon={{ source: Icon.Gauge, tintColor: Color.Red }}
        />
      </List.Section>
    </List>
  );
}
