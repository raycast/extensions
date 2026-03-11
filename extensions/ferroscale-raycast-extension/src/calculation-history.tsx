import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  LocalStorage,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import type { QuickWeightResult } from "@ferroscale/metal-core/quick";

const KG_TO_LBS = 2.20462;
const HISTORY_KEY = "ferroscale-recent-calculations";

interface HistoryEntry {
  query: string;
  result: QuickWeightResult;
  timestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Persistence helpers                                                */
/* ------------------------------------------------------------------ */

/** Backfill fields added after the initial release so old LocalStorage
 *  entries don't crash display code that expects them to be present. */
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

async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

async function removeEntry(
  entries: HistoryEntry[],
  timestamp: number,
): Promise<HistoryEntry[]> {
  const updated = entries.filter((e) => e.timestamp !== timestamp);
  await saveHistory(updated);
  return updated;
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                 */
/* ------------------------------------------------------------------ */

function formatKgLbs(kg: number): string {
  return `${kg.toFixed(3)} kg / ${(kg * KG_TO_LBS).toFixed(3)} lbs`;
}

function formatTonnes(kg: number): string {
  const t = kg / 1000;
  if (t < 0.001) return "";
  return `${t.toFixed(4)} t`;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Entry detail view                                                  */
/* ------------------------------------------------------------------ */

function buildDetailMarkdown(entry: HistoryEntry): string {
  const r = entry.result;
  const rows: [string, string][] = [
    ["Profile", `${r.profileLabel} (${r.profileAlias.toUpperCase()})`],
    ["Material", `${r.materialGradeId} — ${r.densityKgPerM3.toFixed(0)} kg/m³`],
    ["Length", `${r.lengthMm.toFixed(0)} mm`],
    ["Quantity", String(r.quantity)],
    ["Unit weight", formatKgLbs(r.unitWeightKg)],
    ["Total weight", formatKgLbs(r.totalWeightKg)],
    ...(r.linearDensityKgPerM != null
      ? ([["Linear density", `${r.linearDensityKgPerM.toFixed(3)} kg/m`]] as [
          string,
          string,
        ][])
      : []),
  ];

  const tonnes = formatTonnes(r.totalWeightKg);
  if (tonnes) rows.push(["Total (tonnes)", tonnes]);

  if (r.surfaceAreaM2 != null) {
    rows.push(["Surface area", `${r.surfaceAreaM2.toFixed(3)} m² (outer)`]);
    if (r.linearSurfaceM2PerM != null) {
      rows.push(["Linear surface", `${r.linearSurfaceM2PerM.toFixed(3)} m²/m`]);
    }
  }

  if (r.unitPriceAmount != null && r.totalPriceAmount != null) {
    const sym = r.currency ?? "EUR";
    rows.push(["Unit price", `${r.unitPriceAmount.toFixed(4)} ${sym}`]);
    rows.push(["Total price", `${r.totalPriceAmount.toFixed(2)} ${sym}`]);
  }

  const tableRows = rows
    .map(([label, value]) => `| ${label} | ${value} |`)
    .join("\n");

  return [
    `# ${entry.query}`,
    "",
    `*Calculated ${formatTimestamp(entry.timestamp)}*`,
    "",
    "| Field | Value |",
    "|:------|:------|",
    tableRows,
    "",
    "---",
    "",
    `**Normalized input:** \`${r.normalizedInput}\``,
  ].join("\n");
}

function EntryDetail({
  entry,
  onDelete,
}: {
  entry: HistoryEntry;
  onDelete: () => void;
}) {
  const markdown = buildDetailMarkdown(entry);
  const r = entry.result;
  const sym = r.currency ?? "EUR";

  const jsonExport = JSON.stringify(
    {
      query: entry.query,
      timestamp: entry.timestamp,
      calculatedAt: new Date(entry.timestamp).toISOString(),
      profile: r.profileLabel,
      profileAlias: r.profileAlias.toUpperCase(),
      material: r.materialGradeId,
      densityKgPerM3: r.densityKgPerM3,
      lengthMm: r.lengthMm,
      quantity: r.quantity,
      unitWeightKg: +r.unitWeightKg.toFixed(3),
      unitWeightLbs: +(r.unitWeightKg * KG_TO_LBS).toFixed(3),
      totalWeightKg: +r.totalWeightKg.toFixed(3),
      totalWeightLbs: +(r.totalWeightKg * KG_TO_LBS).toFixed(3),
      totalWeightTonne: +r.totalWeightTonne.toFixed(6),
      linearDensityKgPerM: +r.linearDensityKgPerM.toFixed(3),
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
      normalizedInput: r.normalizedInput,
    },
    null,
    2,
  );

  return (
    <Detail
      markdown={markdown}
      navigationTitle={entry.query}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              content={entry.query}
              title="Copy Query"
              icon={Icon.ArrowRight}
            />
            <Action.CopyToClipboard
              content={`${r.totalWeightKg.toFixed(3)} kg`}
              title="Copy Total Weight (kg)"
              icon={Icon.Download}
            />
            <Action.CopyToClipboard
              content={`${(r.totalWeightKg * KG_TO_LBS).toFixed(3)} lbs`}
              title="Copy Total Weight (lbs)"
              icon={Icon.Download}
            />
            {formatTonnes(r.totalWeightKg) ? (
              <Action.CopyToClipboard
                content={formatTonnes(r.totalWeightKg)}
                title="Copy Total Weight (t)"
                icon={Icon.Download}
              />
            ) : null}
            <Action.CopyToClipboard
              content={`${r.linearDensityKgPerM.toFixed(3)} kg/m`}
              title="Copy Linear Density"
              icon={Icon.Ruler}
            />
            {r.surfaceAreaM2 != null && (
              <Action.CopyToClipboard
                content={`${r.surfaceAreaM2.toFixed(3)} m²`}
                title="Copy Surface Area"
                icon={Icon.AppWindowGrid2x2}
              />
            )}
            {r.totalPriceAmount != null && (
              <Action.CopyToClipboard
                content={`${(r.totalPriceAmount ?? 0).toFixed(2)} ${sym}`}
                title="Copy Total Price"
                icon={Icon.BankNote}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Export">
            <Action.CopyToClipboard
              content={jsonExport}
              title="Copy as JSON"
              icon={Icon.Code}
            />
            <Action.CopyToClipboard
              content={buildDetailMarkdown(entry)}
              title="Copy as Markdown"
              icon={Icon.Document}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Manage">
            <Action
              title="Delete Entry"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={onDelete}
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

export function CalculationHistoryView() {
  const { push } = useNavigation();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory().then((entries) => {
      setHistory(entries);
      setIsLoading(false);
    });
  }, []);

  const handleDelete = useCallback(
    async (timestamp: number) => {
      const updated = await removeEntry(history, timestamp);
      setHistory(updated);
    },
    [history],
  );

  const handleClearAll = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Clear All History?",
      message: "This will permanently remove all saved calculations.",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (confirmed) {
      await LocalStorage.removeItem(HISTORY_KEY);
      setHistory([]);
    }
  }, []);

  const buildExportCsv = useCallback(() => {
    const header =
      "query,profile,material,density_kg_m3,length_mm,qty,unit_weight_kg,total_weight_kg,linear_density_kg_m,calculated_at";
    const rows = history.map((e) => {
      const r = e.result;
      return [
        `"${e.query}"`,
        `"${r.profileLabel}"`,
        `"${r.materialGradeId}"`,
        r.densityKgPerM3.toFixed(0),
        r.lengthMm.toFixed(0),
        r.quantity,
        r.unitWeightKg.toFixed(3),
        r.totalWeightKg.toFixed(3),
        r.linearDensityKgPerM.toFixed(3),
        `"${new Date(e.timestamp).toISOString()}"`,
      ].join(",");
    });
    return [header, ...rows].join("\n");
  }, [history]);

  if (history.length === 0 && !isLoading) {
    return (
      <List isLoading={isLoading} navigationTitle="Calculation History">
        <List.EmptyView
          icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
          title="No History Yet"
          description="Calculations from Quick Metal Weight appear here automatically."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Calculation History"
      searchBarPlaceholder="Search queries, profiles, or materials…"
    >
      <List.Section
        title="Recent Calculations"
        subtitle={`${history.length} saved`}
      >
        {history.map((entry) => {
          const r = entry.result;
          const tonnes = formatTonnes(r.totalWeightKg);
          const subtitle = [
            `${r.profileAlias.toUpperCase()} · ${r.lengthMm.toFixed(0)} mm · qty ${r.quantity}`,
            tonnes ? `· ${tonnes}` : "",
          ]
            .filter(Boolean)
            .join(" ");

          const accessories: List.Item.Accessory[] = [
            { text: formatRelative(entry.timestamp), icon: Icon.Clock },
            { text: `${r.totalWeightKg.toFixed(3)} kg` },
          ];
          if (r.linearDensityKgPerM) {
            accessories.push({
              text: `${r.linearDensityKgPerM.toFixed(2)} kg/m`,
            });
          }

          return (
            <List.Item
              key={entry.timestamp}
              title={entry.query}
              subtitle={subtitle}
              icon={{
                source: Icon.CheckCircle,
                tintColor: Color.Green,
              }}
              accessories={accessories as List.Item.Accessory[]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    icon={Icon.Sidebar}
                    target={
                      <EntryDetail
                        entry={entry}
                        onDelete={() => handleDelete(entry.timestamp)}
                      />
                    }
                  />
                  <Action.CopyToClipboard
                    content={entry.query}
                    title="Copy Query"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    content={`${r.totalWeightKg.toFixed(3)} kg`}
                    title="Copy Total Weight (kg)"
                    icon={Icon.Download}
                  />
                  {r.linearDensityKgPerM != null && (
                    <Action.CopyToClipboard
                      content={`${r.linearDensityKgPerM.toFixed(3)} kg/m`}
                      title="Copy Linear Density"
                      icon={Icon.Ruler}
                    />
                  )}
                  {r.surfaceAreaM2 != null && (
                    <Action.CopyToClipboard
                      content={`${r.surfaceAreaM2.toFixed(3)} m²`}
                      title="Copy Surface Area"
                      icon={Icon.AppWindowGrid2x2}
                    />
                  )}
                  {r.totalPriceAmount != null && (
                    <Action.CopyToClipboard
                      content={`${(r.totalPriceAmount ?? 0).toFixed(2)} ${r.currency ?? "EUR"}`}
                      title="Copy Total Price"
                      icon={Icon.BankNote}
                    />
                  )}
                  <ActionPanel.Section title="Export">
                    <Action.CopyToClipboard
                      content={buildDetailMarkdown(entry)}
                      title="Copy Entry as Markdown"
                      icon={Icon.Document}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Manage">
                    <Action
                      title="Delete Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      onAction={() => handleDelete(entry.timestamp)}
                    />
                    <Action
                      title="Clear All History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["ctrl"], key: "k" }}
                      onAction={handleClearAll}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Bulk Export">
                    <Action.CopyToClipboard
                      content={buildExportCsv()}
                      title="Copy All History as CSV"
                      icon={Icon.List}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
