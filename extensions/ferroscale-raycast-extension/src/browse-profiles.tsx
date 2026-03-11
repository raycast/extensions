import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { PROFILE_DEFINITIONS } from "./metal-core/datasets/profiles";
import type {
  ManualProfileDefinition,
  ProfileCategory,
  StandardProfileDefinition,
} from "./metal-core/datasets/types";
import { PROFILE_CATEGORY_LABELS } from "./metal-core/datasets/types";

/* ------------------------------------------------------------------ */
/*  Category display config                                            */
/* ------------------------------------------------------------------ */

const CATEGORY_ICONS: Record<ProfileCategory, { source: Icon; tintColor: Color }> = {
  bars: { source: Icon.Minus, tintColor: Color.Orange },
  tubes: { source: Icon.Circle, tintColor: Color.Blue },
  plates_sheets: { source: Icon.AppWindowGrid2x2, tintColor: Color.Red },
  structural: { source: Icon.Building, tintColor: Color.Green },
};

/* ------------------------------------------------------------------ */
/*  Standard profile detail                                            */
/* ------------------------------------------------------------------ */

function StandardProfileDetail({
  profile,
}: {
  profile: StandardProfileDefinition;
}) {
  const rows = profile.sizes
    .map((size) => {
      const perimeter =
        size.perimeterMm != null
          ? `${size.perimeterMm} mm`
          : "—";
      return `| ${size.label} | ${size.areaMm2.toLocaleString()} | ${perimeter} | ${size.referenceLabel} |`;
    })
    .join("\n");

  const markdown = [
    `# ${profile.label}`,
    "",
    `**Formula:** ${profile.formulaLabel}`,
    `**Standard:** ${profile.referenceLabel}`,
    `**Sizes available:** ${profile.sizes.length}`,
    "",
    "| Size | Area (mm²) | Perimeter (mm) | Reference |",
    "|------|-----------|---------------|-----------|",
    rows,
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={profile.sizes.map((s) => s.label).join("\n")}
            title="Copy All Size Labels"
            icon={Icon.Clipboard}
          />
          <Action.CopyToClipboard
            content={profile.sizes
              .map((s) => `${s.label}\t${s.areaMm2}`)
              .join("\n")}
            title="Copy Sizes as TSV"
            icon={Icon.Document}
          />
        </ActionPanel>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Manual profile detail                                              */
/* ------------------------------------------------------------------ */

function ManualProfileDetail({
  profile,
}: {
  profile: ManualProfileDefinition;
}) {
  const dimRows = profile.dimensions
    .map(
      (d) =>
        `| ${d.label} | \`${d.key}\` | ${d.minMm} – ${d.maxMm} mm | ${d.defaultMm} mm |`,
    )
    .join("\n");

  const markdown = [
    `# ${profile.label}`,
    "",
    `**Formula:** ${profile.formulaLabel}`,
    `**Standard:** ${profile.referenceLabel}`,
    "",
    "## Dimensions",
    "",
    "| Label | Key | Range | Default |",
    "|-------|-----|-------|---------|",
    dimRows,
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={profile.formulaLabel}
            title="Copy Formula"
            icon={Icon.Clipboard}
          />
        </ActionPanel>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Profile list item                                                  */
/* ------------------------------------------------------------------ */

function ProfileItem({
  profile,
}: {
  profile: ManualProfileDefinition | StandardProfileDefinition;
}) {
  const icon = CATEGORY_ICONS[profile.category];

  if (profile.mode === "standard") {
    const sampleSizes = profile.sizes
      .slice(0, 3)
      .map((s) => s.label)
      .join(", ");
    return (
      <List.Item
        title={profile.label}
        subtitle={`${profile.sizes.length} sizes · ${sampleSizes}…`}
        icon={icon}
        accessories={[
          { text: profile.referenceLabel, icon: Icon.Book },
          { tag: { value: "EN table", color: Color.Blue } },
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Browse Sizes"
              icon={Icon.List}
              target={<StandardProfileDetail profile={profile} />}
            />
            <Action.CopyToClipboard
              content={profile.sizes.map((s) => s.label).join("\n")}
              title="Copy All Size Labels"
              icon={Icon.Clipboard}
            />
            <Action.CopyToClipboard
              content={profile.referenceLabel}
              title="Copy Standard Reference"
              icon={Icon.Book}
            />
          </ActionPanel>
        }
      />
    );
  }

  const dimNames = profile.dimensions.map((d) => d.label).join(", ");
  return (
    <List.Item
      title={profile.label}
      subtitle={`Dimensions: ${dimNames}`}
      icon={icon}
      accessories={[
        { text: profile.referenceLabel, icon: Icon.Book },
        { tag: { value: "formula", color: Color.Orange } },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Dimensions & Formula"
            icon={Icon.Info}
            target={<ManualProfileDetail profile={profile} />}
          />
          <Action.CopyToClipboard
            content={profile.formulaLabel}
            title="Copy Formula"
            icon={Icon.Clipboard}
          />
          <Action.CopyToClipboard
            content={profile.referenceLabel}
            title="Copy Standard Reference"
            icon={Icon.Book}
          />
        </ActionPanel>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main command                                                       */
/* ------------------------------------------------------------------ */

const CATEGORY_ORDER: ProfileCategory[] = [
  "bars",
  "tubes",
  "plates_sheets",
  "structural",
];

export function BrowseProfilesView() {
  const byCategory = CATEGORY_ORDER.reduce<
    Record<ProfileCategory, (ManualProfileDefinition | StandardProfileDefinition)[]>
  >(
    (acc, cat) => {
      acc[cat] = PROFILE_DEFINITIONS.filter((p) => p.category === cat);
      return acc;
    },
    {
      bars: [],
      tubes: [],
      plates_sheets: [],
      structural: [],
    },
  );

  const totalStandard = PROFILE_DEFINITIONS.filter(
    (p) => p.mode === "standard",
  ).reduce((sum, p) => (p.mode === "standard" ? sum + p.sizes.length : sum), 0);

  return (
    <List
      navigationTitle="Browse Profiles"
      searchBarPlaceholder="Search profiles…"
    >
      {CATEGORY_ORDER.map((category) => {
        const profiles = byCategory[category];
        if (profiles.length === 0) return null;

        return (
          <List.Section
            key={category}
            title={PROFILE_CATEGORY_LABELS[category]}
            subtitle={`${profiles.length} profile${profiles.length !== 1 ? "s" : ""}`}
          >
            {profiles.map((profile) => (
              <ProfileItem key={profile.id} profile={profile} />
            ))}
          </List.Section>
        );
      })}

      <List.Section title="Dataset Info">
        <List.Item
          title={`${PROFILE_DEFINITIONS.length} profiles · ${totalStandard} standard sizes`}
          subtitle="Use Quick Metal Weight to calculate — type a profile alias in that command"
          icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
          accessories={[{ text: "Ferroscale Dataset" }]}
        />
      </List.Section>
    </List>
  );
}
