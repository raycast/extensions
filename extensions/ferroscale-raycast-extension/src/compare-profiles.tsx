import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { calculateQuickFromQuery } from "@ferroscale/metal-core/quick";
import type { QuickWeightResult } from "@ferroscale/metal-core/quick";

const KG_TO_LBS = 2.20462;

function fmt(n: number, dec = 3): string {
  return n.toFixed(dec);
}

function fmtKgLbs(kg: number): string {
  return `${fmt(kg)} kg / ${fmt(kg * KG_TO_LBS)} lbs`;
}

function fmtTonnes(kg: number): string {
  const t = kg / 1000;
  return t >= 0.001 ? `${t.toFixed(4)} t` : "—";
}

function fmtSurface(r: QuickWeightResult): string {
  if (r.surfaceAreaM2 == null) return "—";
  return `${fmt(r.surfaceAreaM2)} m²`;
}

function fmtPrice(r: QuickWeightResult): string {
  if (r.totalPriceAmount == null || r.unitPriceAmount == null) return "—";
  const sym = r.currency ?? "EUR";
  return `${fmt(r.totalPriceAmount, 2)} ${sym}  (${fmt(r.unitPriceAmount, 4)} ${sym}/pc)`;
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function buildMarkdown(
  queryA: string,
  queryB: string,
  a: QuickWeightResult,
  b: QuickWeightResult,
): string {
  const rows: [string, string, string][] = [
    ["Profile", a.profileLabel, b.profileLabel],
    ["Alias", a.profileAlias.toUpperCase(), b.profileAlias.toUpperCase()],
    ["Material", a.materialGradeId, b.materialGradeId],
    [
      "Density",
      `${a.densityKgPerM3.toFixed(0)} kg/m³`,
      `${b.densityKgPerM3.toFixed(0)} kg/m³`,
    ],
    ["Length", `${a.lengthMm.toFixed(0)} mm`, `${b.lengthMm.toFixed(0)} mm`],
    ["Quantity", String(a.quantity), String(b.quantity)],
    [
      "Linear density",
      `${a.linearDensityKgPerM.toFixed(3)} kg/m`,
      `${b.linearDensityKgPerM.toFixed(3)} kg/m`,
    ],
    ["Unit weight", fmtKgLbs(a.unitWeightKg), fmtKgLbs(b.unitWeightKg)],
    ["Total weight", fmtKgLbs(a.totalWeightKg), fmtKgLbs(b.totalWeightKg)],
    ["Total (tonnes)", fmtTonnes(a.totalWeightKg), fmtTonnes(b.totalWeightKg)],
    ["Surface area", fmtSurface(a), fmtSurface(b)],
    ["Total price", fmtPrice(a), fmtPrice(b)],
  ];

  const deltaKg = b.totalWeightKg - a.totalWeightKg;
  const deltaSign = deltaKg > 0 ? "+" : "";
  const deltaPct =
    a.totalWeightKg > 0 ? ((deltaKg / a.totalWeightKg) * 100).toFixed(1) : "—";

  const tableHeader = `| | **A** | **B** |\n|:---|:---|:---|\n`;
  const tableRows = rows
    .map(([label, va, vb]) => `| ${cell(label)} | ${cell(va)} | ${cell(vb)} |`)
    .join("\n");

  const deltaSection = [
    "",
    "---",
    "### Weight Delta  (B − A)",
    `| | |`,
    `|:---|:---|`,
    `| Absolute | ${deltaSign}${fmt(deltaKg)} kg |`,
    `| Relative | ${deltaSign}${deltaPct}% |`,
    `| A heavier by | ${deltaKg < 0 ? fmt(Math.abs(deltaKg)) + " kg" : "—"} |`,
    `| B heavier by | ${deltaKg > 0 ? fmt(deltaKg) + " kg" : "—"} |`,
  ].join("\n");

  return [
    "# Profile Comparison",
    "",
    `**A:** \`${queryA}\``,
    `**B:** \`${queryB}\``,
    "",
    tableHeader + tableRows,
    deltaSection,
  ].join("\n");
}

function buildCsvRow(
  queryA: string,
  queryB: string,
  a: QuickWeightResult,
  b: QuickWeightResult,
): string {
  const headers = [
    "query",
    "profile",
    "material",
    "length_mm",
    "qty",
    "unit_weight_kg",
    "total_weight_kg",
    "linear_density_kg_per_m",
  ];
  const rowA = [
    queryA,
    a.profileLabel,
    a.materialGradeId,
    a.lengthMm,
    a.quantity,
    a.unitWeightKg,
    a.totalWeightKg,
    a.linearDensityKgPerM,
  ];
  const rowB = [
    queryB,
    b.profileLabel,
    b.materialGradeId,
    b.lengthMm,
    b.quantity,
    b.unitWeightKg,
    b.totalWeightKg,
    b.linearDensityKgPerM,
  ];
  return [headers.join(","), rowA.join(","), rowB.join(",")].join("\n");
}

function ComparisonDetail({
  queryA,
  queryB,
  resultA,
  resultB,
}: {
  queryA: string;
  queryB: string;
  resultA: QuickWeightResult;
  resultB: QuickWeightResult;
}) {
  const markdown = buildMarkdown(queryA, queryB, resultA, resultB);
  const csv = buildCsvRow(queryA, queryB, resultA, resultB);

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Profile Comparison"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              content={markdown}
              title="Copy as Markdown"
              icon={Icon.Document}
            />
            <Action.CopyToClipboard
              content={csv}
              title="Copy as CSV"
              icon={Icon.List}
            />
            <Action.CopyToClipboard
              content={`${resultA.totalWeightKg.toFixed(3)} kg`}
              title="Copy a Total Weight"
            />
            <Action.CopyToClipboard
              content={`${resultB.totalWeightKg.toFixed(3)} kg`}
              title="Copy B Total Weight"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Result row helpers (shared between phase A and B live previews)   */
/* ------------------------------------------------------------------ */

function ResultRow({
  result,
  primaryAction,
  primaryActionTitle,
  primaryActionIcon,
  secondaryAction,
}: {
  result: QuickWeightResult;
  primaryAction: () => void;
  primaryActionTitle: string;
  primaryActionIcon: Icon;
  secondaryAction?: React.ReactNode;
}) {
  const tonnes = result.totalWeightKg / 1000;
  const tonnesStr = tonnes >= 0.001 ? ` · ${tonnes.toFixed(3)} t` : "";
  return (
    <List.Item
      title={`${fmtKgLbs(result.unitWeightKg)}${tonnesStr}`}
      subtitle={`${result.profileAlias.toUpperCase()} · ${result.lengthMm.toFixed(0)} mm · ${result.materialGradeId}`}
      icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
      accessories={[{ text: `${result.linearDensityKgPerM.toFixed(3)} kg/m` }]}
      actions={
        <ActionPanel>
          <Action
            title={primaryActionTitle}
            icon={primaryActionIcon}
            onAction={primaryAction}
          />
          {secondaryAction}
        </ActionPanel>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main view                                                          */
/* ------------------------------------------------------------------ */

type Phase = "entering_a" | "entering_b";

export function CompareProfilesView() {
  const { push } = useNavigation();

  const [phase, setPhase] = useState<Phase>("entering_a");
  const [queryA, setQueryA] = useState("");
  const [queryB, setQueryB] = useState("");
  const [lockedQueryA, setLockedQueryA] = useState("");
  const [lockedResultA, setLockedResultA] = useState<QuickWeightResult | null>(
    null,
  );

  const activeQuery = phase === "entering_a" ? queryA : queryB;

  const response = useMemo(() => {
    if (!activeQuery.trim()) return null;
    return calculateQuickFromQuery(activeQuery.trim());
  }, [activeQuery]);

  function handleLockA() {
    if (!response?.ok) return;
    setLockedQueryA(queryA.trim());
    setLockedResultA(response.result);
    setPhase("entering_b");
  }

  function handleCompare() {
    if (!response?.ok || !lockedResultA) return;
    push(
      <ComparisonDetail
        queryA={lockedQueryA}
        queryB={queryB.trim()}
        resultA={lockedResultA}
        resultB={response.result}
      />,
    );
  }

  function handleChangeA() {
    setPhase("entering_a");
  }

  const changeAAction = (
    <Action
      title="Change Profile a"
      icon={Icon.ArrowLeft}
      onAction={handleChangeA}
    />
  );

  return (
    <List
      key={phase}
      searchText={phase === "entering_a" ? queryA : queryB}
      onSearchTextChange={phase === "entering_a" ? setQueryA : setQueryB}
      searchBarPlaceholder={
        phase === "entering_a"
          ? "Profile A: ipe 200x6000 mat=s355"
          : "Profile B: hea 200x6000 mat=s355"
      }
      navigationTitle={
        phase === "entering_a" ? "Compare — Profile A" : "Compare — Profile B"
      }
    >
      {/* ---- Phase B: locked A summary ---- */}
      {phase === "entering_b" && lockedResultA ? (
        <List.Section title="Profile A (Locked)">
          <List.Item
            title={`${fmtKgLbs(lockedResultA.unitWeightKg)}`}
            subtitle={`${lockedResultA.profileAlias.toUpperCase()} · ${lockedResultA.lengthMm.toFixed(0)} mm · ${lockedResultA.materialGradeId}`}
            icon={{ source: Icon.Pin, tintColor: Color.Blue }}
            accessories={[
              { text: `${lockedResultA.linearDensityKgPerM.toFixed(3)} kg/m` },
              { text: lockedQueryA, icon: Icon.Code },
            ]}
            actions={<ActionPanel>{changeAAction}</ActionPanel>}
          />
        </List.Section>
      ) : null}

      {/* ---- Active profile input section ---- */}
      <List.Section title={phase === "entering_a" ? "Profile A" : "Profile B"}>
        {/* Empty state */}
        {!activeQuery.trim() ? (
          <List.Item
            title={
              phase === "entering_a"
                ? "Type a quick-weight query"
                : "Type a query to compare against A"
            }
            subtitle="e.g. ipe 200x6000 mat=s355  ·  shss 80x5x6000  ·  rb 30x6000"
            icon={{
              source: Icon.MagnifyingGlass,
              tintColor: Color.SecondaryText,
            }}
          />
        ) : null}

        {/* Error state */}
        {activeQuery.trim() && response && !response.ok ? (
          <List.Item
            title={response.issues[0]?.message ?? "Invalid query"}
            subtitle="Check alias, dimensions and flags"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          />
        ) : null}

        {/* Valid state */}
        {activeQuery.trim() && response?.ok ? (
          <ResultRow
            result={response.result}
            primaryActionTitle={
              phase === "entering_a" ? "Lock Profile A" : "Compare"
            }
            primaryActionIcon={
              phase === "entering_a"
                ? Icon.LockUnlocked
                : Icon.TwoArrowsClockwise
            }
            primaryAction={phase === "entering_a" ? handleLockA : handleCompare}
            secondaryAction={phase === "entering_b" ? changeAAction : undefined}
          />
        ) : null}
      </List.Section>

      {/* ---- Examples (only in empty phase A) ---- */}
      {phase === "entering_a" && !queryA.trim() ? (
        <List.Section title="Examples">
          {[
            ["ipe 200x6000 mat=s355", "EN I-beam, 6 m, S355"],
            ["hea 200x6000 mat=s355", "EN HEA beam, 6 m, S355"],
            ["shss 80x5x6000", "Standard SHS 80×5, 6 m"],
            ["rhss 100x60x5x6000", "Standard RHS 100×60×5, 6 m"],
            ["rb 30x6000 qty=10", "Round bar Ø30, 6 m, qty 10"],
          ].map(([query, subtitle]) => (
            <List.Item
              key={query}
              title={query}
              subtitle={subtitle}
              icon={Icon.Text}
              actions={
                <ActionPanel>
                  <Action
                    title="Use as Profile a"
                    icon={Icon.ArrowRight}
                    onAction={() => setQueryA(query)}
                  />
                  <Action.CopyToClipboard content={query} title="Copy Query" />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
