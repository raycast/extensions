import { List, ActionPanel, Action, Icon } from "@raycast/api";
import React, { useState } from "react";
import { Scrambow } from "scrambow";

const scrambleConfigs = [
  { title: "3x3", type: "333" },
  { title: "4x4", type: "444" },
  { title: "5x5", type: "555" },
  { title: "6x6", type: "666" },
  { title: "7x7", type: "777" },
  { title: "2x2", type: "222" },
  { title: "Square-1", type: "sq1" },
  { title: "Megaminx", type: "megaminx" },
  { title: "Pyraminx", type: "pyraminx" },
  { title: "Skewb", type: "skewb" },
  { title: "Clock", type: "clock-optimal" },
  { title: "3x3 PLL", type: "pll" },
  { title: "3x3 2GLL (2-Gen Last Layer)", type: "2gll" },
  { title: "3x3 BLE (Brooks Last Edge)", type: "ble" },
  { title: "3x3 CLS (Corner Last Slot)", type: "cls" },
  { title: "3x3 CMLL Sune", type: "cmllsune" },
  { title: "3x3 Edges", type: "edges" },
  { title: "3x3 LL (Last Layer)", type: "ll" },
  { title: "3x3 LSLL (Last Slot Last Layer)", type: "lsll" },
  { title: "3x3 LSE (Roux Last Six Edges)", type: "lse" },
  { title: "3x3 CMLL (Roux Last Layer Corners)", type: "cmll" },
  { title: "3x3 LCCP (Roux Last Cr & Cr Perm)", type: "lccp" },
  { title: "3x3 RU", type: "ru" },
  { title: "3x3 LU", type: "lu" },
  { title: "3x3 RUD", type: "rud" },
  { title: "3x3 RUL", type: "rul" },
  { title: "3x3 NLS", type: "nls" },
  { title: "3x3 TSLE", type: "tsle" },
  { title: "3x3 WV (Winter Variation)", type: "wv" },
  { title: "3x3 ZBLL", type: "zbll" },
  { title: "3x3 TriZBLL (Triangular ZBLL)", type: "trizbll" },
  { title: "3x3 ZZ", type: "zz" },
  { title: "3x3 ZZLL", type: "zzll" },
  { title: "3x3 ZZLSLL", type: "zzlsll" },
  { title: "FTO", type: "fto" },
];

// Generate a scramble string for a given type. For 3x3 the default works
function makeScramble(type: string) {
  const s = new Scrambow();
  if (type !== "333") {
    s.setType(type);
  }
  return s.get()[0].scramble_string;
}

const items = scrambleConfigs.map((cfg) => ({ title: cfg.title, type: cfg.type }));

export function getFirstScramble() {
  // Generate a single scramble on demand for callers outside the component.
  return makeScramble(scrambleConfigs[0].type);
}

export default function Command() {
  // Map of type -> generated scramble (single string). Start empty and generate lazily.
  const [generated, setGenerated] = useState<Record<string, string>>({});
  // Per-type loading flags so the UI can show a generating state for a single item.
  const [loadingTypes, setLoadingTypes] = useState<Record<string, boolean>>({});

  // Ensure a scramble for `type` has been generated. No-op if already present or currently generating.
  function ensureGenerated(type: string) {
    if (generated[type] || loadingTypes[type]) {
      return;
    }
    setLoadingTypes((prev) => ({ ...prev, [type]: true }));
    // makeScramble is synchronous; we still set a loading flag briefly to drive the UI.
    const scr = makeScramble(type);
    setGenerated((prev) => ({ ...prev, [type]: scr }));
    setLoadingTypes((prev) => ({ ...prev, [type]: false }));
  }

  // Regenerating a single scramble (for the quick action)
  function regenerate(type: string) {
    setLoadingTypes((prev) => ({ ...prev, [type]: true }));
    const scr = makeScramble(type);
    setGenerated((prev) => ({ ...prev, [type]: scr }));
    setLoadingTypes((prev) => ({ ...prev, [type]: false }));
  }

  function renderScrambleItem(s: { title: string; type: string }) {
    const scramble = generated?.[s.type];
    const isLoading = loadingTypes[s.type];
    const detail = scramble ?? (isLoading ? "Generating..." : "");
    // Hide the action panel until a scramble exists so the copy action never uses an empty string.
    const actions =
      scramble !== undefined ? (
        <ActionPanel>
          <Action.CopyToClipboard content={scramble} />
          <Action title="Regenerate" icon={Icon.ArrowClockwise} onAction={() => regenerate(s.type)} />
        </ActionPanel>
      ) : undefined;

    return (
      <List.Item
        key={s.type}
        id={s.type}
        title={s.title}
        detail={<List.Item.Detail markdown={`${detail}`} />}
        actions={actions}
      />
    );
  }

  return (
    <List
      searchBarPlaceholder="Filter by cube type"
      isShowingDetail
      // We don't precompute everything anymore; generate when an item is selected.
      onSelectionChange={(id) => {
        if (typeof id === "string") {
          ensureGenerated(id);
        }
      }}
    >
      {(() => {
        const clockIndex = items.findIndex((it) => it.type === "clock-optimal" || it.title === "Clock");
        const primaryItems = clockIndex >= 0 ? items.slice(0, clockIndex + 1) : items;
        const variantItems = clockIndex >= 0 ? items.slice(clockIndex + 1) : [];

        return (
          <>
            {primaryItems.map((s) => renderScrambleItem(s))}

            {variantItems.length > 0 && (
              <List.Section title="3x3 Variants">{variantItems.map((s) => renderScrambleItem(s))}</List.Section>
            )}
          </>
        );
      })()}
    </List>
  );
}
