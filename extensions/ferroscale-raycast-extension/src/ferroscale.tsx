import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  LocalStorage,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowseProfilesView } from "./browse-profiles";
import { BrowseMaterialsView } from "./browse-materials";
import { CompareProfilesView } from "./compare-profiles";
import { CalculationHistoryView } from "./calculation-history";
import {
  calculateQuickFromQuery,
  searchByDimension,
  parseDimSearchQuery,
} from "@ferroscale/metal-core/quick";
import type {
  QuickWeightResult,
  DimensionMatch,
} from "@ferroscale/metal-core/quick";

import { PROFILE_CATEGORY_LABELS } from "@ferroscale/metal-core/datasets";
import type { ProfileCategory } from "@ferroscale/metal-core/datasets";

const KG_TO_LBS = 2.20462;
const MAX_HISTORY = 10;
const HISTORY_KEY = "ferroscale-recent-calculations";

interface HistoryEntry {
  query: string;
  result: QuickWeightResult;
  timestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatKgLbs(kg: number): string {
  return `${kg.toFixed(3)} kg / ${(kg * KG_TO_LBS).toFixed(3)} lbs`;
}

function formatTonnes(kg: number): string {
  const t = kg / 1000;
  if (t < 0.01) return "";
  return `${t.toFixed(3)} t`;
}

function resultToJson(r: QuickWeightResult): string {
  return JSON.stringify(
    {
      profile: r.profileAlias.toUpperCase(),
      profileLabel: r.profileLabel,
      quantity: r.quantity,
      lengthMm: r.lengthMm,
      material: r.materialGradeId,
      densityKgPerM3: r.densityKgPerM3,
      unitWeightKg: +r.unitWeightKg.toFixed(3),
      unitWeightLbs: +(r.unitWeightKg * KG_TO_LBS).toFixed(3),
      totalWeightKg: +r.totalWeightKg.toFixed(3),
      totalWeightLbs: +(r.totalWeightKg * KG_TO_LBS).toFixed(3),
      totalWeightTonne: +(r.totalWeightTonne ?? r.totalWeightKg / 1000).toFixed(
        6,
      ),
      linearDensityKgPerM: +(r.linearDensityKgPerM ?? 0).toFixed(3),
      ...(r.surfaceAreaM2 != null
        ? { surfaceAreaM2: +r.surfaceAreaM2.toFixed(3) }
        : {}),
      ...(r.unitPriceAmount != null
        ? {
            unitPriceAmount: +r.unitPriceAmount.toFixed(4),
            totalPriceAmount: +(r.totalPriceAmount ?? 0).toFixed(4),
            currency: r.currency,
          }
        : {}),
    },
    null,
    2,
  );
}

function resultToSummary(r: QuickWeightResult): string {
  const lines = [
    `Profile: ${r.profileAlias.toUpperCase()} (${r.profileLabel})`,
    `Material: ${r.materialGradeId} (${r.densityKgPerM3.toFixed(0)} kg/m³)`,
    `Length: ${r.lengthMm.toFixed(0)} mm`,
    `Quantity: ${r.quantity}`,
    `Unit weight: ${formatKgLbs(r.unitWeightKg)}`,
    ...(r.linearDensityKgPerM != null
      ? [`Linear density: ${r.linearDensityKgPerM.toFixed(3)} kg/m`]
      : []),
  ];
  if (r.quantity > 1) {
    lines.push(`Total weight: ${formatKgLbs(r.totalWeightKg)}`);
  }
  const tonnes = formatTonnes(r.totalWeightKg);
  if (tonnes) lines.push(`Total (tonnes): ${tonnes}`);
  if (r.surfaceAreaM2 != null) {
    lines.push(`Surface area: ${r.surfaceAreaM2.toFixed(3)} m²`);
  }
  if (r.unitPriceAmount != null && r.totalPriceAmount != null) {
    const sym = r.currency ?? "EUR";
    lines.push(`Unit price: ${r.unitPriceAmount.toFixed(2)} ${sym}`);
    lines.push(`Total price: ${r.totalPriceAmount.toFixed(2)} ${sym}`);
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  History persistence                                                */
/* ------------------------------------------------------------------ */

function normalizeResult(r: QuickWeightResult): QuickWeightResult {
  const totalWeightTonne = r.totalWeightTonne ?? r.totalWeightKg / 1000;
  const linearDensityKgPerM =
    r.linearDensityKgPerM ??
    (r.lengthMm > 0 ? r.unitWeightKg / (r.lengthMm / 1000) : 0);
  return { ...r, totalWeightTonne, linearDensityKgPerM };
}

async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw) as HistoryEntry[];
    return entries.map((e) => ({ ...e, result: normalizeResult(e.result) }));
  } catch {
    return [];
  }
}

async function saveToHistory(
  query: string,
  result: QuickWeightResult,
): Promise<HistoryEntry[]> {
  const existing = await loadHistory();
  const entry: HistoryEntry = { query, result, timestamp: Date.now() };
  const filtered = existing.filter((e) => e.query !== query);
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

/* ------------------------------------------------------------------ */
/*  Shared copy actions                                                */
/* ------------------------------------------------------------------ */

function ExtraCopyActions({ result }: { result: QuickWeightResult }) {
  return (
    <ActionPanel.Section title="Copy">
      <Action.CopyToClipboard
        content={resultToJson(result)}
        title="Copy as JSON"
        icon={Icon.Code}
      />
      <Action.CopyToClipboard
        content={resultToSummary(result)}
        title="Copy as Formatted Summary"
        icon={Icon.Document}
      />
      <Action.CopyToClipboard
        content={result.normalizedInput}
        title="Copy Normalized Input"
      />
      {result.surfaceAreaM2 != null && (
        <Action.CopyToClipboard
          content={`${result.surfaceAreaM2.toFixed(3)} m²`}
          title="Copy Surface Area"
          icon={Icon.AppWindowGrid2x2}
        />
      )}
      {result.unitPriceAmount != null && result.totalPriceAmount != null && (
        <Action.CopyToClipboard
          content={`${result.totalPriceAmount.toFixed(2)} ${result.currency ?? "EUR"}`}
          title="Copy Total Price"
          icon={Icon.BankNote}
        />
      )}
    </ActionPanel.Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Reference                                                    */
/* ------------------------------------------------------------------ */

const QUICK_REFERENCE_MARKDOWN = [
  "# Alias Quick Reference",
  "",
  "## Bars",
  "- `rb`: `D × L`",
  "- `sb`: `A × L`",
  "- `fb`: `W × T × L`  *(or `fb W × L t=T`)*",
  "",
  "## Tubes (Custom dimensions)",
  "- `chs` / `pipe`: `OD × T × L`",
  "- `shs`: `A × A × T × L`  *(or `A × T × L`)*",
  "- `rhs`: `W × H × T × L`",
  "",
  "## Tubes (EN Standard sizes)",
  "- `shss` / `shstd`: `A × T × L`  *(e.g. `shss 40x4x6000`)*",
  "- `rhss` / `rhstd`: `W × H × T × L`  *(e.g. `rhss 100x60x5x6000`)*",
  "",
  "## Structural Profiles (EN standard sizes)",
  "- `ipe`, `ipn`, `hea`, `heb`, `hem`, `upn`, `upe`, `tee`",
  "- Format: `<alias> <size> × <length>`  *(e.g. `ipe 200x6000`)*",
  "",
  "## Equal-Leg Angle",
  "- `angle` / `l`: `legA × legB × T × L`  *(custom, or `a × T × L` for equal legs)*",
  "- `la` / `leq`: `A × T × L`  *(EN 10056 standard sizes, e.g. `la 50x5x6000`)*",
  "",
  "## Sheet and Plate",
  "- `sheet` / `sht`",
  "- `plate` / `pl`",
  "- Orders accepted: `W × T × L` or `W × L × T`",
  "- Or use `t=` flag: `sheet 1250x6000 t=2`",
  "",
  "## Flags",
  "- `qty=<n>` — quantity (default: 1)",
  "- `mat=<grade>` — material (default: steel-s235jr)",
  "- `dens=<kg/m³>` — custom density override",
  "- `unit=<mm|cm|m|in|ft>` — fallback unit for bare numbers",
  "- `t=<thickness>` — thickness shorthand for fb / sheet / plate",
  "- `area=<mm²>` — custom cross-section area (bypasses size table)",
  "- `price=<value>` — unit price amount",
  "- `currency=<EUR|USD|GBP|PLN|BAM>` — pricing currency (default: EUR)",
  "- `basis=<kg|lb|m|ft|pc>` — pricing basis (default: kg)",
  "",
  "## Material shortcuts",
  "- Steel: `s235`, `s275`, `s355`, `s420`, `s460`",
  "- Stainless: `304`, `316`, `316l`, `duplex`",
  "- Aluminium: `alu`, `6060`, `6082`, `5754`, `7075`",
  "- Copper: `copper`, `brass`, `bronze`",
  "- Titanium: `ti`, `tigrade5`",
  "- Cast iron: `castiron`, `gjl250`",
  "",
  "## Dimension Search",
  "- Type `?<mm>` to find all standard profile sizes with that nominal dimension",
  "- Examples: `?40`  `?100`  `?200`",
  "",
  "## Examples",
  "- `shs 40x40x4x6000 qty=5`",
  "- `shss 40x4x6000 mat=s355`",
  "- `rhss 100x60x5x6000 qty=4`",
  "- `chs 60.3x3.2x3000 qty=4`",
  "- `la 80x8x6000 mat=s355`",
  "- `sheet 1250x3000x2 qty=5`",
  "- `plate 1500x3000 t=10`",
  "- `fb 80x6000 t=8 price=1.5 currency=EUR`",
  "- `ipe 200x6000 mat=s355 price=0.85`",
  "- `ipe 6000 area=3200 mat=s355`",
].join("\n");

/* ------------------------------------------------------------------ */
/*  Alias Quick Reference — searchable List view                      */
/* ------------------------------------------------------------------ */

interface RefEntry {
  title: string;
  subtitle: string;
  example: string;
  section: string;
  icon: Icon;
  iconColor: Color;
}

const QUICK_REF_ENTRIES: RefEntry[] = [
  // Bars
  {
    section: "Bars",
    title: "rb",
    subtitle: "Round Bar  ·  D × L",
    example: "rb 30x6000",
    icon: Icon.Circle,
    iconColor: Color.Orange,
  },
  {
    section: "Bars",
    title: "sb",
    subtitle: "Square Bar  ·  A × L",
    example: "sb 30x6000",
    icon: Icon.Square,
    iconColor: Color.Orange,
  },
  {
    section: "Bars",
    title: "fb",
    subtitle: "Flat Bar  ·  W × T × L  (or fb W×L t=T)",
    example: "fb 80x6000 t=8",
    icon: Icon.Minus,
    iconColor: Color.Orange,
  },
  // Tubes — Custom
  {
    section: "Tubes — Custom",
    title: "chs  /  pipe",
    subtitle: "Circular Hollow Section  ·  OD × T × L",
    example: "chs 60.3x3.2x6000",
    icon: Icon.Circle,
    iconColor: Color.Blue,
  },
  {
    section: "Tubes — Custom",
    title: "shs",
    subtitle: "Square Hollow Section  ·  A × T × L",
    example: "shs 40x4x6000",
    icon: Icon.Square,
    iconColor: Color.Blue,
  },
  {
    section: "Tubes — Custom",
    title: "rhs",
    subtitle: "Rectangular Hollow Section  ·  W × H × T × L",
    example: "rhs 80x60x5x6000",
    icon: Icon.AppWindowGrid2x2,
    iconColor: Color.Blue,
  },
  // Tubes — EN Standard
  {
    section: "Tubes — EN Standard",
    title: "shss  /  shstd",
    subtitle: "SHS EN table  ·  A × T × L",
    example: "shss 40x4x6000 mat=s355",
    icon: Icon.Square,
    iconColor: Color.Purple,
  },
  {
    section: "Tubes — EN Standard",
    title: "rhss  /  rhstd",
    subtitle: "RHS EN table  ·  W × H × T × L",
    example: "rhss 100x60x5x6000 qty=4",
    icon: Icon.AppWindowGrid2x2,
    iconColor: Color.Purple,
  },
  // Structural
  {
    section: "Structural (EN)",
    title: "ipe",
    subtitle: "IPE beam  ·  ipe <size>×<length>",
    example: "ipe 200x6000 mat=s355",
    icon: Icon.Building,
    iconColor: Color.Green,
  },
  {
    section: "Structural (EN)",
    title: "ipn",
    subtitle: "IPN beam  ·  ipn <size>×<length>",
    example: "ipn 200x6000",
    icon: Icon.Building,
    iconColor: Color.Green,
  },
  {
    section: "Structural (EN)",
    title: "hea  /  heb  /  hem",
    subtitle: "HEA / HEB / HEM beam  ·  <alias> <size>×<length>",
    example: "hea 200x6000 mat=s355",
    icon: Icon.Building,
    iconColor: Color.Green,
  },
  {
    section: "Structural (EN)",
    title: "upn  /  upe",
    subtitle: "UPN / UPE channel  ·  <alias> <size>×<length>",
    example: "upn 160x6000",
    icon: Icon.Building,
    iconColor: Color.Green,
  },
  {
    section: "Structural (EN)",
    title: "tee",
    subtitle: "T-section  ·  tee <size>×<length>",
    example: "tee 100x6000",
    icon: Icon.Building,
    iconColor: Color.Green,
  },
  // Angles
  {
    section: "Angles",
    title: "angle  /  l",
    subtitle:
      "Custom angle  ·  legA × legB × T × L  (or a × T × L for equal legs)",
    example: "angle 50x50x5x6000",
    icon: Icon.Pin,
    iconColor: Color.Yellow,
  },
  {
    section: "Angles",
    title: "la  /  leq",
    subtitle: "EN 10056 equal-leg angle  ·  A × T × L",
    example: "la 80x8x6000 mat=s355",
    icon: Icon.Pin,
    iconColor: Color.Yellow,
  },
  // Plates & Sheets
  {
    section: "Plates & Sheets",
    title: "sheet  /  sht",
    subtitle: "Sheet  ·  W × T × L  or  W × L × T  or  W × L t=T",
    example: "sheet 1250x6000 t=2 qty=5",
    icon: Icon.AppWindowGrid2x2,
    iconColor: Color.Red,
  },
  {
    section: "Plates & Sheets",
    title: "plate  /  pl",
    subtitle: "Plate  ·  W × T × L  or  W × L t=T",
    example: "plate 1500x3000 t=10",
    icon: Icon.AppWindowGrid2x2,
    iconColor: Color.Red,
  },
  // Flags
  {
    section: "Flags",
    title: "qty=<n>",
    subtitle: "Quantity  ·  default: 1",
    example: "ipe 200x6000 qty=5",
    icon: Icon.Hashtag,
    iconColor: Color.Blue,
  },
  {
    section: "Flags",
    title: "mat=<grade>",
    subtitle: "Material  ·  default: s235  ·  e.g. s355, 304, alu, brass, ti",
    example: "shss 40x4x6000 mat=s355",
    icon: Icon.Tag,
    iconColor: Color.Orange,
  },
  {
    section: "Flags",
    title: "t=<thickness>",
    subtitle: "Thickness shorthand for fb / sheet / plate",
    example: "fb 80x6000 t=8",
    icon: Icon.Ruler,
    iconColor: Color.Yellow,
  },
  {
    section: "Flags",
    title: "area=<mm²>",
    subtitle: "Custom cross-section area — bypasses size table",
    example: "ipe 6000 area=3200 mat=s355",
    icon: Icon.BarChart,
    iconColor: Color.Green,
  },
  {
    section: "Flags",
    title: "dens=<kg/m³>",
    subtitle: "Custom density override",
    example: "rb 30x6000 dens=7900",
    icon: Icon.Gauge,
    iconColor: Color.Red,
  },
  {
    section: "Flags",
    title: "unit=<mm|cm|m|in|ft>",
    subtitle: "Fallback unit for bare numbers  ·  default: mm",
    example: "rb 30x6000 unit=mm",
    icon: Icon.Ruler,
    iconColor: Color.SecondaryText,
  },
  {
    section: "Flags",
    title: "price=<value>  currency=  basis=",
    subtitle:
      "Pricing  ·  currency: EUR|USD|GBP|PLN|BAM  ·  basis: kg|lb|m|ft|pc",
    example: "ipe 200x6000 price=0.85 currency=EUR basis=kg",
    icon: Icon.BankNote,
    iconColor: Color.Green,
  },
  // Materials — Steel
  {
    section: "Materials — Steel",
    title: "s235  /  s275  /  s355  /  s420  /  s460",
    subtitle: "Structural steel grades (7850 kg/m³)",
    example: "rb 30x6000 mat=s355",
    icon: Icon.Tag,
    iconColor: Color.SecondaryText,
  },
  // Materials — Stainless
  {
    section: "Materials — Stainless",
    title: "304  /  316  /  316l  /  duplex",
    subtitle: "Stainless steel grades (~7900–8000 kg/m³)",
    example: "rb 30x6000 mat=316",
    icon: Icon.Tag,
    iconColor: Color.SecondaryText,
  },
  // Materials — Aluminium
  {
    section: "Materials — Aluminium",
    title: "alu  /  6060  /  6082  /  5754  /  7075",
    subtitle: "Aluminium alloys (~2700 kg/m³)",
    example: "rb 30x6000 mat=alu",
    icon: Icon.Tag,
    iconColor: Color.SecondaryText,
  },
  // Materials — Other
  {
    section: "Materials — Other",
    title: "copper  /  brass  /  bronze",
    subtitle: "Copper alloys (~8400–8900 kg/m³)",
    example: "rb 30x6000 mat=brass",
    icon: Icon.Tag,
    iconColor: Color.SecondaryText,
  },
  {
    section: "Materials — Other",
    title: "ti  /  tigrade5",
    subtitle: "Titanium (~4500 kg/m³)",
    example: "rb 30x6000 mat=ti",
    icon: Icon.Tag,
    iconColor: Color.SecondaryText,
  },
  {
    section: "Materials — Other",
    title: "castiron  /  gjl250",
    subtitle: "Cast iron (~7200 kg/m³)",
    example: "rb 30x6000 mat=castiron",
    icon: Icon.Tag,
    iconColor: Color.SecondaryText,
  },
  // Dimension search
  {
    section: "Dimension Search",
    title: "?<mm>",
    subtitle: "Find all standard profile sizes with that nominal dimension",
    example: "?200",
    icon: Icon.MagnifyingGlass,
    iconColor: Color.Purple,
  },
  {
    section: "Dimension Search",
    title: "?<mm>x<mm>",
    subtitle: "Filter by two dimensions simultaneously",
    example: "?200x100",
    icon: Icon.MagnifyingGlass,
    iconColor: Color.Purple,
  },
];

function AliasQuickReferenceView() {
  const sections = [...new Set(QUICK_REF_ENTRIES.map((e) => e.section))];
  return (
    <List
      navigationTitle="Alias Quick Reference"
      searchBarPlaceholder="Search aliases, flags, materials…"
    >
      {sections.map((section) => (
        <List.Section key={section} title={section}>
          {QUICK_REF_ENTRIES.filter((e) => e.section === section).map(
            (entry) => (
              <List.Item
                key={entry.title}
                title={entry.title}
                subtitle={entry.subtitle}
                icon={{ source: entry.icon, tintColor: entry.iconColor }}
                accessories={[{ text: entry.example, icon: Icon.Code }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      content={entry.example}
                      title="Copy Example"
                      icon={Icon.Clipboard}
                    />
                    <Action.CopyToClipboard
                      content={entry.title.split(/\s*\/\s*/)[0].trim()}
                      title="Copy Alias"
                      icon={Icon.Code}
                    />
                    <Action.CopyToClipboard
                      content={QUICK_REFERENCE_MARKDOWN}
                      title="Copy Full Reference as Markdown"
                      icon={Icon.Document}
                    />
                  </ActionPanel>
                }
              />
            ),
          )}
        </List.Section>
      ))}
    </List>
  );
}

function AliasQuickReferenceActions() {
  return (
    <ActionPanel.Section title="Quick Reference">
      <Action.Push
        title="Open Alias Quick Reference"
        icon={Icon.Book}
        target={<AliasQuickReferenceView />}
      />
      <Action.CopyToClipboard
        content={QUICK_REFERENCE_MARKDOWN}
        title="Copy Alias Quick Reference"
      />
    </ActionPanel.Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Dimension search results section                                   */
/* ------------------------------------------------------------------ */

const CATEGORY_ORDER: ProfileCategory[] = [
  "tubes",
  "bars",
  "structural",
  "plates_sheets",
];

function DimSearchResults({
  dims,
  matches,
  onCalculate,
}: {
  dims: number[];
  matches: DimensionMatch[];
  onCalculate: (query: string) => void;
}) {
  const dimLabel = dims.join(" × ") + " mm";

  if (matches.length === 0) {
    return (
      <List.Section title={`Dimension Search: ${dimLabel}`}>
        <List.Item
          title="No profiles found"
          subtitle={`No standard size matches ${dimLabel}`}
          icon={{
            source: Icon.MagnifyingGlass,
            tintColor: Color.SecondaryText,
          }}
        />
      </List.Section>
    );
  }

  // Group by category in defined order
  const grouped = new Map<ProfileCategory, DimensionMatch[]>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const m of matches) {
    grouped.get(m.profileCategory)?.push(m);
  }

  return (
    <>
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped.get(cat) ?? [];
        if (items.length === 0) return null;
        return (
          <List.Section
            key={cat}
            title={`${PROFILE_CATEGORY_LABELS[cat]} — ${dimLabel}`}
          >
            {items.map((m) => {
              const calcQuery = `${m.canonicalAlias} ${m.sizeId}x6000`;
              return (
                <List.Item
                  key={`${m.profileId}-${m.sizeId}`}
                  title={m.sizeLabel}
                  subtitle={`${m.linearDensityKgPerM.toFixed(3)} kg/m · ${m.referenceLabel}`}
                  icon={{ source: Icon.Gauge, tintColor: Color.Blue }}
                  accessories={[
                    { text: `A = ${m.areaMm2} mm²` },
                    { text: m.canonicalAlias },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Calculate (6 M Default)"
                        icon={Icon.Calculator}
                        onAction={() => onCalculate(calcQuery)}
                      />
                      <Action.CopyToClipboard
                        content={calcQuery}
                        title="Copy Query"
                        icon={Icon.Clipboard}
                      />
                      <Action.CopyToClipboard
                        content={`${m.linearDensityKgPerM.toFixed(3)} kg/m`}
                        title="Copy Linear Density"
                        icon={Icon.Ruler}
                      />
                      <AliasQuickReferenceActions />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main command                                                       */
/* ------------------------------------------------------------------ */

export default function Command() {
  const { push } = useNavigation();
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();

  // Detect dimension search mode
  const dims = useMemo(() => parseDimSearchQuery(trimmedQuery), [trimmedQuery]);

  const dimMatches = useMemo(
    () => (dims !== null ? searchByDimension(dims) : []),
    [dims],
  );

  // Calculator mode — only when not in dim-search mode
  const response = useMemo(() => {
    if (!trimmedQuery || dims !== null) return null;
    return calculateQuickFromQuery(trimmedQuery);
  }, [trimmedQuery, dims]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    if (response?.ok) {
      saveTimerRef.current = setTimeout(() => {
        saveToHistory(trimmedQuery, response.result);
      }, 1500);
    }
    return () => clearTimeout(saveTimerRef.current);
  }, [response, trimmedQuery]);

  const handleCalculate = useCallback((q: string) => {
    setQuery(q);
  }, []);

  return (
    <List
      searchBarPlaceholder="ipe 200x6000 mat=s355  ·  shss 40x4x6000  ·  ?40 to find all 40 mm profiles"
      onSearchTextChange={setQuery}
      searchText={query}
    >
      {/* ---- Dimension search mode ---- */}
      {dims !== null ? (
        <DimSearchResults
          dims={dims}
          matches={dimMatches}
          onCalculate={handleCalculate}
        />
      ) : null}

      {/* ---- Empty state ---- */}
      {!trimmedQuery && dims === null ? (
        <>
          <List.Section title="Tools">
            <List.Item
              title="Browse Profiles"
              subtitle="All standard sizes, formulas and EN references"
              icon={{ source: Icon.List, tintColor: Color.Blue }}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    icon={Icon.List}
                    onAction={() => push(<BrowseProfilesView />)}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="Browse Materials"
              subtitle="Density, grades and material shortcuts"
              icon={{ source: Icon.Tag, tintColor: Color.Orange }}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    icon={Icon.Tag}
                    onAction={() => push(<BrowseMaterialsView />)}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="Compare Profiles"
              subtitle="Side-by-side weight and cost comparison"
              icon={{ source: Icon.TwoArrowsClockwise, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    icon={Icon.TwoArrowsClockwise}
                    onAction={() => push(<CompareProfilesView />)}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="Calculation History"
              subtitle="View, export and manage recent calculations"
              icon={{ source: Icon.Clock, tintColor: Color.Purple }}
              actions={
                <ActionPanel>
                  <Action
                    title="Open"
                    icon={Icon.Clock}
                    onAction={() => push(<CalculationHistoryView />)}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Reference">
            <List.Item
              title="Alias Quick Reference"
              subtitle="All aliases, flags, materials and examples"
              icon={{ source: Icon.Book, tintColor: Color.Green }}
              accessories={[{ text: "always available" }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Alias Quick Reference"
                    icon={Icon.Book}
                    target={<AliasQuickReferenceView />}
                  />
                  <Action.CopyToClipboard
                    content={QUICK_REFERENCE_MARKDOWN}
                    title="Copy Alias Quick Reference"
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="Dimension Search"
              subtitle="Type ?40 (or any mm value) to find all standard profiles with that dimension"
              icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Purple }}
              accessories={[{ text: "?<mm>" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Search 40 Mm Profiles"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => setQuery("?40")}
                  />
                  <Action
                    title="Search 100 Mm Profiles"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => setQuery("?100")}
                  />
                  <Action
                    title="Search 200 Mm Profiles"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => setQuery("?200")}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Input Patterns">
            <List.Item
              title="Bars"
              subtitle="rb D×L · sb A×L · fb W×T×L (or fb W×L t=T)"
              icon={{ source: Icon.Minus, tintColor: Color.Orange }}
            />
            <List.Item
              title="Tubes — Custom"
              subtitle="chs OD×T×L · shs A×T×L · rhs W×H×T×L"
              icon={{ source: Icon.Circle, tintColor: Color.Blue }}
            />
            <List.Item
              title="Tubes — EN Standard Sizes"
              subtitle="shss A×T×L · rhss W×H×T×L"
              icon={{ source: Icon.Circle, tintColor: Color.Purple }}
            />
            <List.Item
              title="Structural Profiles"
              subtitle="ipe / ipn / hea / heb / hem / upn / upe / tee  +  size × length"
              icon={{ source: Icon.Building, tintColor: Color.Green }}
            />
            <List.Item
              title="Angles"
              subtitle="angle a×b×T×L (custom) · la a×T×L (EN 10056 standard)"
              icon={{ source: Icon.Pin, tintColor: Color.Yellow }}
            />
            <List.Item
              title="Sheets and Plates"
              subtitle="sheet / plate  W×T×L  or  W×L×T  or  W×L t=T"
              icon={{ source: Icon.AppWindowGrid2x2, tintColor: Color.Red }}
            />
          </List.Section>

          <List.Section title="Flags">
            <List.Item
              title="qty=<n>"
              subtitle="Default: 1"
              icon={{ source: Icon.Hashtag, tintColor: Color.Blue }}
            />
            <List.Item
              title="mat=<grade>"
              subtitle="Default: steel-s235jr  ·  also s275, s355, 304, 316, alu, brass, ti, castiron…"
              icon={{ source: Icon.Tag, tintColor: Color.Orange }}
            />
            <List.Item
              title="t=<thickness>"
              subtitle="Thickness shorthand for fb, sheet, plate (e.g. t=8 or t=8mm)"
              icon={{ source: Icon.Ruler, tintColor: Color.Yellow }}
            />
            <List.Item
              title="area=<mm²>"
              subtitle="Custom cross-section area override — bypasses size table"
              icon={{ source: Icon.BarChart, tintColor: Color.Green }}
            />
            <List.Item
              title="price=<value>  currency=<EUR|USD|GBP…>  basis=<kg|m|pc>"
              subtitle="Optional pricing — shows unit and total cost in results"
              icon={{ source: Icon.BankNote, tintColor: Color.Green }}
            />
            <List.Item
              title="dens=<kg/m³>"
              subtitle="Custom density override"
              icon={{ source: Icon.Gauge, tintColor: Color.Red }}
            />
          </List.Section>

          <List.Section title="Examples">
            <List.Item
              title="shss 40x4x6000 qty=5"
              subtitle="Standard SHS from EN table"
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="shss 40x4x6000 qty=5"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="rhss 100x60x5x6000 mat=s355"
              subtitle="Standard RHS with material override"
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="rhss 100x60x5x6000 mat=s355"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="la 80x8x6000 qty=12"
              subtitle="Standard equal-leg angle (EN 10056)"
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="la 80x8x6000 qty=12"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="ipe 200x6000 mat=s355 price=0.85"
              subtitle="EN beam with pricing"
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="ipe 200x6000 mat=s355 price=0.85"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="plate 1500x6000 t=10 qty=3"
              subtitle="Plate using t= thickness shorthand"
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="plate 1500x6000 t=10 qty=3"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="ipe 6000 area=3200 mat=s355"
              subtitle="Custom area override on an EN profile"
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="ipe 6000 area=3200 mat=s355"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      ) : null}

      {/* ---- Error state (calculator mode only) ---- */}
      {trimmedQuery && dims === null && response && !response.ok ? (
        <List.Section title="Parse Error">
          <List.Item
            title={response.issues[0]?.message ?? "Invalid input"}
            subtitle="Check alias, dimensions and flags · or type ?<mm> to search by dimension"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={trimmedQuery}
                  title="Copy Query"
                />
                <Action.CopyToClipboard
                  content="shss 40x4x6000 qty=5"
                  title="Copy Example Query"
                />
                <AliasQuickReferenceActions />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {/* ---- Result state (calculator mode only) ---- */}
      {trimmedQuery && dims === null && response && response.ok ? (
        <List.Section title="Result">
          {response.result.quantity > 1 ? (
            <>
              {/* Single piece row */}
              <List.Item
                title={`Single (1 pc): ${formatKgLbs(response.result.unitWeightKg)}`}
                subtitle={buildResultSubtitle(response.result, false)}
                icon={{ source: Icon.Circle, tintColor: Color.Blue }}
                accessories={buildResultAccessories(response.result, false)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      content={`${response.result.unitWeightKg.toFixed(3)} kg`}
                      title="Copy Single Weight (Kg)"
                    />
                    <Action.CopyToClipboard
                      content={`${(response.result.unitWeightKg * KG_TO_LBS).toFixed(3)} lbs`}
                      title="Copy Single Weight (Lbs)"
                    />
                    <ExtraCopyActions result={response.result} />
                    <AliasQuickReferenceActions />
                  </ActionPanel>
                }
              />
              {/* Total row */}
              <List.Item
                title={`Total (${response.result.quantity} pcs): ${formatKgLbs(response.result.totalWeightKg)}`}
                subtitle={buildResultSubtitle(response.result, true)}
                icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                accessories={buildResultAccessories(response.result, true)}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      content={`${response.result.totalWeightKg.toFixed(3)} kg`}
                      title="Copy Total Weight (Kg)"
                    />
                    <Action.CopyToClipboard
                      content={`${(response.result.totalWeightKg * KG_TO_LBS).toFixed(3)} lbs`}
                      title="Copy Total Weight (Lbs)"
                    />
                    {formatTonnes(response.result.totalWeightKg) ? (
                      <Action.CopyToClipboard
                        content={formatTonnes(response.result.totalWeightKg)}
                        title="Copy Total Weight (T)"
                      />
                    ) : null}
                    <ExtraCopyActions result={response.result} />
                    <AliasQuickReferenceActions />
                  </ActionPanel>
                }
              />
            </>
          ) : (
            /* Single quantity row */
            <List.Item
              title={`Weight: ${formatKgLbs(response.result.unitWeightKg)}`}
              subtitle={buildResultSubtitle(response.result, false)}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              accessories={buildResultAccessories(response.result, false)}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content={`${response.result.unitWeightKg.toFixed(3)} kg`}
                    title="Copy Weight (Kg)"
                  />
                  <Action.CopyToClipboard
                    content={`${(response.result.unitWeightKg * KG_TO_LBS).toFixed(3)} lbs`}
                    title="Copy Weight (Lbs)"
                  />
                  {formatTonnes(response.result.unitWeightKg) ? (
                    <Action.CopyToClipboard
                      content={formatTonnes(response.result.unitWeightKg)}
                      title="Copy Weight (T)"
                    />
                  ) : null}
                  <ExtraCopyActions result={response.result} />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
          )}

          {/* kg/m row — always shown */}
          <List.Item
            title={`${response.result.linearDensityKgPerM.toFixed(3)} kg/m`}
            subtitle={`Linear density · ${response.result.profileAlias.toUpperCase()} · ${response.result.densityKgPerM3.toFixed(0)} kg/m³`}
            icon={{ source: Icon.Ruler, tintColor: Color.SecondaryText }}
            accessories={[{ text: response.result.materialGradeId }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={`${response.result.linearDensityKgPerM.toFixed(3)} kg/m`}
                  title="Copy Linear Density"
                />
                <ExtraCopyActions result={response.result} />
                <AliasQuickReferenceActions />
              </ActionPanel>
            }
          />

          {/* Surface area row — only when computable */}
          {response.result.surfaceAreaM2 != null && (
            <List.Item
              title={`${response.result.surfaceAreaM2.toFixed(3)} m²`}
              subtitle={`Surface area (outer) · ${(response.result.linearSurfaceM2PerM ?? 0).toFixed(3)} m²/m`}
              icon={{
                source: Icon.AppWindowGrid2x2,
                tintColor: Color.SecondaryText,
              }}
              accessories={[{ text: "paint / coating" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content={`${response.result.surfaceAreaM2.toFixed(3)} m²`}
                    title="Copy Surface Area"
                  />
                  <ExtraCopyActions result={response.result} />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
          )}

          {/* Pricing row — only when price= flag was used */}
          {response.result.unitPriceAmount != null &&
            response.result.totalPriceAmount != null && (
              <List.Item
                title={`${response.result.totalPriceAmount.toFixed(2)} ${response.result.currency ?? "EUR"}`}
                subtitle={`Total price · unit ${response.result.unitPriceAmount.toFixed(4)} ${response.result.currency ?? "EUR"} / pc`}
                icon={{ source: Icon.BankNote, tintColor: Color.Yellow }}
                accessories={[{ text: `× ${response.result.quantity} pcs` }]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard
                      content={`${response.result.totalPriceAmount.toFixed(2)} ${response.result.currency ?? "EUR"}`}
                      title="Copy Total Price"
                    />
                    <Action.CopyToClipboard
                      content={`${response.result.unitPriceAmount.toFixed(4)} ${response.result.currency ?? "EUR"}`}
                      title="Copy Unit Price"
                    />
                    <ExtraCopyActions result={response.result} />
                    <AliasQuickReferenceActions />
                  </ActionPanel>
                }
              />
            )}
        </List.Section>
      ) : null}
    </List>
  );
}

/* ------------------------------------------------------------------ */
/*  Result row helpers                                                 */
/* ------------------------------------------------------------------ */

function buildResultSubtitle(
  result: QuickWeightResult,
  isTotal: boolean,
): string {
  const weight = isTotal ? result.totalWeightKg : result.unitWeightKg;
  const tonnes = formatTonnes(weight);
  const parts = [
    `${result.profileAlias.toUpperCase()} · ${result.lengthMm.toFixed(0)} mm`,
  ];
  if (tonnes) parts.push(tonnes);
  return parts.join(" · ");
}

function buildResultAccessories(
  result: QuickWeightResult,
  isTotal: boolean,
): { text: string }[] {
  const accessories: { text: string }[] = [];
  if (result.linearDensityKgPerM != null) {
    accessories.push({ text: `${result.linearDensityKgPerM.toFixed(2)} kg/m` });
  }
  if (isTotal && result.quantity > 1) {
    accessories.push({ text: `qty ${result.quantity}` });
  }
  if (!isTotal) {
    accessories.push({ text: result.materialGradeId });
  }
  return accessories;
}
