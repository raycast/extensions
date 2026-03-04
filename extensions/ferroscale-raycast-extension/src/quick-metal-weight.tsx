import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  LocalStorage,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateQuickFromQuery } from "@ferroscale/metal-core/quick";
import type { QuickWeightResult } from "@ferroscale/metal-core/quick";

const KG_TO_LBS = 2.20462;
const MAX_HISTORY = 10;
const HISTORY_KEY = "ferroscale-recent-calculations";

interface HistoryEntry {
  query: string;
  result: QuickWeightResult;
  timestamp: number;
}

/* ---- Helpers ---- */

function formatKgLbs(kg: number): string {
  return `${kg.toFixed(3)} kg / ${(kg * KG_TO_LBS).toFixed(3)} lbs`;
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
  ];
  if (r.quantity > 1) {
    lines.push(`Total weight: ${formatKgLbs(r.totalWeightKg)}`);
  }
  return lines.join("\n");
}

/* ---- History persistence ---- */

async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
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
  // Remove duplicate queries, prepend new, cap at MAX_HISTORY
  const filtered = existing.filter((e) => e.query !== query);
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

/* ---- Copy actions shared across result items ---- */

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
    </ActionPanel.Section>
  );
}

/* ---- Quick Reference ---- */

const QUICK_REFERENCE_MARKDOWN = [
  "# Alias Quick Reference",
  "",
  "## Tubes and Bars",
  "- `chs` / `pipe`: `OD x T x L`",
  "- `shs`: `A x A x T x L`",
  "- `rhs`: `W x H x T x L`",
  "- `rb`: `D x L`",
  "- `sb`: `A x L`",
  "- `fb`: `W x T x L`",
  "",
  "## Sheet and Plate",
  "- `sheet` / `sht`",
  "- `plate` / `pl`",
  "- Orders accepted:",
  "- `width x length x thickness`",
  "- `width x thickness x length`",
  "",
  "## EN Profiles",
  "- `ipe`, `ipn`, `hea`, `heb`, `hem`, `upn`, `upe`, `tee`",
  "- Format: `<alias> <size>x<length>`",
  "",
  "## Flags",
  "- `qty=<number>` (default `1`)",
  "- `mat=<grade|alias>` (default `steel-s235jr`)",
  "- `dens=<kg/m3>`",
  "- `unit=<mm|cm|m|in|ft>`",
  "",
  "## Examples",
  "- `shs 40x40x2x4500mm qty=5`",
  "- `chs 60.3x3.2x3000 qty=4`",
  "- `sheet 1250x3000x2 qty=5`",
  "- `plate 1500x3000x10`",
  "- `ipe 200x6000 mat=s355`",
].join("\n");

function AliasQuickReferenceDetail() {
  return <Detail markdown={QUICK_REFERENCE_MARKDOWN} />;
}

function AliasQuickReferenceActions() {
  return (
    <ActionPanel.Section title="Quick Reference">
      <Action.Push
        title="Open Alias Quick Reference"
        icon={Icon.Book}
        target={<AliasQuickReferenceDetail />}
      />
      <Action.CopyToClipboard
        content={QUICK_REFERENCE_MARKDOWN}
        title="Copy Alias Quick Reference"
      />
    </ActionPanel.Section>
  );
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const trimmedQuery = query.trim();

  // Load history on mount
  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const response = useMemo(() => {
    if (!trimmedQuery) return null;
    return calculateQuickFromQuery(trimmedQuery);
  }, [trimmedQuery]);

  // Save successful results to history (debounced — waits 1.5s after last keystroke)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    if (response?.ok) {
      saveTimerRef.current = setTimeout(() => {
        saveToHistory(trimmedQuery, response.result).then(setHistory);
      }, 1500);
    }
    return () => clearTimeout(saveTimerRef.current);
  }, [response, trimmedQuery]);

  const handleHistorySelect = useCallback((entry: HistoryEntry) => {
    setQuery(entry.query);
  }, []);

  const handleClearHistory = useCallback(async () => {
    await LocalStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  }, []);

  return (
    <List
      searchBarPlaceholder="shs 40x40x2x4500mm qty=5"
      onSearchTextChange={setQuery}
      searchText={query}
    >
      {!trimmedQuery ? (
        <>
          {/* Recent calculations */}
          {history.length > 0 && (
            <List.Section title="Recent">
              {history.map((entry) => (
                <List.Item
                  key={`${entry.query}-${entry.timestamp}`}
                  title={entry.query}
                  subtitle={`${entry.result.profileAlias.toUpperCase()} · ${formatKgLbs(entry.result.totalWeightKg)}`}
                  icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
                  accessories={[{ text: `qty ${entry.result.quantity}` }]}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Re-Run Query"
                        icon={Icon.ArrowRight}
                        onAction={() => handleHistorySelect(entry)}
                      />
                      <Action.CopyToClipboard
                        content={`${entry.result.totalWeightKg.toFixed(3)} kg`}
                        title="Copy Weight"
                      />
                      <ExtraCopyActions result={entry.result} />
                      <ActionPanel.Section title="History">
                        <Action
                          title="Clear History"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["ctrl"], key: "k" }}
                          onAction={handleClearHistory}
                        />
                      </ActionPanel.Section>
                      <AliasQuickReferenceActions />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          <List.Section title="Reference">
            <List.Item
              title="Alias Quick Reference"
              subtitle="Open all aliases, formats, flags, and examples"
              icon={{ source: Icon.Book, tintColor: Color.Green }}
              accessories={[{ text: "always available" }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Open Alias Quick Reference"
                    icon={Icon.Book}
                    target={<AliasQuickReferenceDetail />}
                  />
                  <Action.CopyToClipboard
                    content={QUICK_REFERENCE_MARKDOWN}
                    title="Copy Alias Quick Reference"
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Input Patterns and Aliases">
            <List.Item
              title="Tubes and Bars"
              subtitle="chs ODxT xL, rb DxL, sb AxL, fb WxT xL, shs AxAxT xL, rhs WxHxT xL"
              icon={{ source: Icon.Box, tintColor: Color.Blue }}
            />
            <List.Item
              title="Sheets and Plates"
              subtitle="sheet/sht or plate/pl: width x length x thickness (or width x thickness x length)"
              icon={{ source: Icon.AppWindowGrid2x2, tintColor: Color.Purple }}
            />
            <List.Item
              title="EN Structural Profiles"
              subtitle="ipe/ipn/hea/heb/hem/upn/upe/tee + size x length"
              icon={{ source: Icon.Building, tintColor: Color.Green }}
            />
          </List.Section>

          <List.Section title="Flags">
            <List.Item
              title="qty=<number>"
              subtitle="Default: qty=1"
              icon={{ source: Icon.Hashtag, tintColor: Color.Blue }}
            />
            <List.Item
              title="mat=<grade or alias>"
              subtitle="Default: steel-s235jr"
              icon={{ source: Icon.Tag, tintColor: Color.Orange }}
            />
            <List.Item
              title="dens=<kg/m3>"
              subtitle="Custom density override"
              icon={{ source: Icon.Gauge, tintColor: Color.Red }}
            />
            <List.Item
              title="unit=<mm|cm|m|in|ft>"
              subtitle="Fallback unit"
              icon={{ source: Icon.Ruler, tintColor: Color.Purple }}
            />
          </List.Section>

          <List.Section title="High-Value Examples">
            <List.Item
              title="shs 40x40x2x4500mm qty=5"
              subtitle="Square tube, shows Single + Total"
              icon={Icon.Text}
              accessories={[{ text: "SHS" }, { text: "qty" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="shs 40x40x2x4500mm qty=5"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="chs 60.3x3.2x3000 qty=4"
              subtitle="Round tube with quantity"
              icon={Icon.Text}
              accessories={[{ text: "CHS" }, { text: "qty" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="chs 60.3x3.2x3000 qty=4"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="sheet 1250x3000x2 qty=5"
              subtitle="Sheet in width x length x thickness order"
              icon={Icon.Text}
              accessories={[{ text: "SHEET" }, { text: "qty" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="sheet 1250x3000x2 qty=5"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="plate 1500x3000x10"
              subtitle="Plate default quantity (1 pc)"
              icon={Icon.Text}
              accessories={[{ text: "PLATE" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="plate 1500x3000x10"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
            <List.Item
              title="ipe 200x6000 mat=s355"
              subtitle="EN profile with material override"
              icon={Icon.Text}
              accessories={[{ text: "EN" }, { text: "mat" }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    content="ipe 200x6000 mat=s355"
                    title="Copy Query"
                  />
                  <AliasQuickReferenceActions />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      ) : null}

      {trimmedQuery && response && !response.ok ? (
        <List.Section title="Parse Error">
          <List.Item
            title={response.issues[0]?.message ?? "Invalid input"}
            subtitle="Try an explicit alias and full dimensions"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  content={trimmedQuery}
                  title="Copy Query"
                />
                <Action.CopyToClipboard
                  content="shs 40x40x2x4500mm qty=5"
                  title="Copy Example Query"
                />
                <AliasQuickReferenceActions />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {trimmedQuery && response && response.ok ? (
        <List.Section title="Result">
          {response.result.quantity > 1 ? (
            <>
              <List.Item
                title={`Single (1 pc): ${formatKgLbs(response.result.unitWeightKg)}`}
                subtitle={`${response.result.profileAlias.toUpperCase()} - ${response.result.lengthMm.toFixed(0)} mm`}
                icon={{ source: Icon.Circle, tintColor: Color.Blue }}
                accessories={[{ text: `qty ${response.result.quantity}` }]}
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
                    <Action.CopyToClipboard
                      content={`${response.result.totalWeightKg.toFixed(3)} kg`}
                      title="Copy Total Weight (Kg)"
                    />
                    <ExtraCopyActions result={response.result} />
                    <AliasQuickReferenceActions />
                  </ActionPanel>
                }
              />
              <List.Item
                title={`Total (${response.result.quantity} pcs): ${formatKgLbs(response.result.totalWeightKg)}`}
                subtitle={`${response.result.profileAlias.toUpperCase()} - ${response.result.materialGradeId}`}
                icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
                accessories={[
                  {
                    text: `${response.result.densityKgPerM3.toFixed(0)} kg/m³`,
                  },
                ]}
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
                    <Action.CopyToClipboard
                      content={`${response.result.unitWeightKg.toFixed(3)} kg`}
                      title="Copy Single Weight (Kg)"
                    />
                    <ExtraCopyActions result={response.result} />
                    <AliasQuickReferenceActions />
                  </ActionPanel>
                }
              />
            </>
          ) : (
            <List.Item
              title={`Weight: ${formatKgLbs(response.result.unitWeightKg)}`}
              subtitle={`${response.result.profileAlias.toUpperCase()} - 1 pc - ${response.result.lengthMm.toFixed(0)} mm`}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              accessories={[{ text: response.result.materialGradeId }]}
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
