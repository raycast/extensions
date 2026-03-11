import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
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
  // Pad or escape for markdown table
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
    ["Linear density", `${a.linearDensityKgPerM.toFixed(3)} kg/m`, `${b.linearDensityKgPerM.toFixed(3)} kg/m`],
    ["Unit weight", fmtKgLbs(a.unitWeightKg), fmtKgLbs(b.unitWeightKg)],
    ["Total weight", fmtKgLbs(a.totalWeightKg), fmtKgLbs(b.totalWeightKg)],
    ["Total (tonnes)", fmtTonnes(a.totalWeightKg), fmtTonnes(b.totalWeightKg)],
    ["Surface area", fmtSurface(a), fmtSurface(b)],
    ["Total price", fmtPrice(a), fmtPrice(b)],
  ];

  // Weight delta
  const deltaKg = b.totalWeightKg - a.totalWeightKg;
  const deltaSign = deltaKg > 0 ? "+" : "";
  const deltaPct =
    a.totalWeightKg > 0
      ? ((deltaKg / a.totalWeightKg) * 100).toFixed(1)
      : "—";

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
              title="Copy A Total Weight"
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

export function CompareProfilesView() {
  const { push } = useNavigation();
  const [queryA, setQueryA] = useState("");
  const [queryB, setQueryB] = useState("");
  const [errorA, setErrorA] = useState<string | undefined>();
  const [errorB, setErrorB] = useState<string | undefined>();

  function handleCompare() {
    let valid = true;

    const responseA = calculateQuickFromQuery(queryA.trim());
    if (!responseA.ok) {
      setErrorA(responseA.issues[0]?.message ?? "Invalid query A");
      valid = false;
    } else {
      setErrorA(undefined);
    }

    const responseB = calculateQuickFromQuery(queryB.trim());
    if (!responseB.ok) {
      setErrorB(responseB.issues[0]?.message ?? "Invalid query B");
      valid = false;
    } else {
      setErrorB(undefined);
    }

    if (!valid) return;
    if (!responseA.ok || !responseB.ok) return;

    push(
      <ComparisonDetail
        queryA={queryA.trim()}
        queryB={queryB.trim()}
        resultA={responseA.result}
        resultB={responseB.result}
      />,
    );
  }

  return (
    <Form
      navigationTitle="Compare Profiles"
      actions={
        <ActionPanel>
          <Action
            title="Compare"
            icon={Icon.ArrowRight}
            onAction={handleCompare}
          />
          <Action.CopyToClipboard
            content="ipe 200x6000 mat=s355"
            title="Copy Example Query"
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="How to use"
        text="Enter two quick-weight queries (same syntax as Quick Metal Weight). Press Compare to see a side-by-side breakdown and weight delta."
      />
      <Form.TextField
        id="queryA"
        title="Query A"
        placeholder="ipe 200x6000 mat=s355"
        value={queryA}
        onChange={setQueryA}
        error={errorA}
        onBlur={() => {
          if (!queryA.trim()) return;
          const r = calculateQuickFromQuery(queryA.trim());
          setErrorA(r.ok ? undefined : (r.issues[0]?.message ?? "Invalid"));
        }}
      />
      <Form.TextField
        id="queryB"
        title="Query B"
        placeholder="hea 200x6000 mat=s355"
        value={queryB}
        onChange={setQueryB}
        error={errorB}
        onBlur={() => {
          if (!queryB.trim()) return;
          const r = calculateQuickFromQuery(queryB.trim());
          setErrorB(r.ok ? undefined : (r.issues[0]?.message ?? "Invalid"));
        }}
      />
      <Form.Description
        title="Examples"
        text={[
          "A: ipe 200x6000 mat=s355     B: hea 200x6000 mat=s355",
          "A: shss 80x5x6000            B: rhs 80x60x5x6000",
          "A: rb 30x6000 qty=10         B: shs 40x40x3x6000 qty=10",
        ].join("\n")}
      />
    </Form>
  );
}
