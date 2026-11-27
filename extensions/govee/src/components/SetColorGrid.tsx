import { colord } from "colord";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Action, ActionPanel, Grid, Icon, Keyboard, Toast, showToast, useNavigation } from "@raycast/api";

import { colorWordEntries } from "@/lib/colorWords";

export type SetColorGridProps =
  | { setColor: (color: { r: number; g: number; b: number }) => void; multiple?: undefined }
  | {
      setColor?: undefined;
      /** Tick several colours (Enter), then save them all (⌘↵). Used for custom colour tags. */
      multiple: {
        initial: string[];
        /** Custom colour tags: ⌘↵ saves, Esc saves if changed. */
        onSave?: (hexes: string[]) => void;
        saveLabel?: string;
        /** Instead of saving: actions that use the ticked colours right away (first is ⌘↵). */
        applies?: Array<{ title: string; icon: Icon; shortcut?: Keyboard.Shortcut; run: (hexes: string[]) => void }>;
        /** Most colours that can be ticked. */
        max?: number;
        /** Screen title, and a one-line explanation shown on the top section. */
        title?: string;
        hint?: string;
      };
    };

type Tile = { key: string; title?: string; hex: string };

const SetColorGrid = ({ setColor, multiple }: SetColorGridProps) => {
  const { pop } = useNavigation();
  const [ticked, setTicked] = useState<string[]>(() => (multiple?.initial ?? []).map((h) => h.toUpperCase()));
  const toggle = (hex: string) => {
    if (!ticked.includes(hex) && multiple?.max && ticked.length >= multiple.max) {
      showToast({ style: Toast.Style.Failure, title: `Up to ${multiple.max} colors` });
      return;
    }
    setTicked((t) => (t.includes(hex) ? t.filter((h) => h !== hex) : [...t, hex]));
  };
  const save = () => {
    multiple?.onSave?.(ticked);
    saved.current = true;
    pop();
  };

  // Esc saves too, but only if the ticks changed: they start as the snapshot's current colours
  // (possibly guessed), and saving those untouched would turn a guess into a custom tag.
  const saved = useRef(false);
  const latest = useRef(ticked);
  latest.current = ticked;
  useEffect(
    () => () => {
      if (!multiple?.onSave || saved.current) return;
      const initial = multiple.initial.map((h) => h.toUpperCase());
      const now = latest.current;
      if (now.length !== initial.length || now.some((h, i) => h !== initial[i])) multiple.onSave?.(now);
    },
    [],
  );
  const [amountOfColors, setAmountOfColors] = useState(16);
  const [search, setSearch] = useState("");

  const colorValues = useCallback(
    (numberOfColors: number): Tile[] =>
      new Array(numberOfColors).fill(null).map((_, i) => ({
        key: `value-${i}`,
        hex: colord(`hsl(${i * (360 / numberOfColors)}, 100%, 50%)`)
          .toHex()
          .toUpperCase(),
      })),
    [],
  );
  const words = useMemo(colorWordEntries, []);

  // Search: an exact hex ("#FFE0B0", "ffe0b0", "#fe0"),
  // whites by name, words from assets/color-words.txt, and grid colours by hex.
  const results = useMemo((): Tile[] => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const out: Tile[] = [];
    // Hex only when it's clearly meant: "#" in front, or a full 6-digit code. Bare short letters
    // like "fe" or "bed" are word searches, not hex.
    const hex = q.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/) ?? q.match(/^([0-9a-f]{6})$/);
    if (hex) out.push({ key: `hex-${hex[1]}`, title: `#${hex[1].toUpperCase()}`, hex: colord(`#${hex[1]}`).toHex() });
    out.push(
      ...words
        .filter(([phrase]) => phrase.includes(q))
        .sort(([a], [b]) => Number(!a.startsWith(q)) - Number(!b.startsWith(q)) || a.localeCompare(b))
        .map(([phrase, h]) => ({ key: `w-${phrase}`, title: phrase, hex: h })),
    );
    // Partial hex ("#FF8") finds wheel colours starting with it, labelled, without near-duplicates.
    const partial = q.match(/^#([0-9a-f]{1,5})$/)?.[1];
    if (partial) {
      const shown = new Set<string>();
      out.push(
        ...colorValues(360)
          .filter((t) => t.hex.slice(1).toLowerCase().startsWith(partial) && !shown.has(t.hex) && shown.add(t.hex))
          .slice(0, 16)
          .map((t) => ({ ...t, title: t.hex })),
      );
    }
    const seen = new Set<string>();
    return out.filter((t) => !seen.has(t.key) && seen.add(t.key));
  }, [search, words, colorValues]);

  const renderTile = ({ key, title, hex }: Tile) => {
    const value = colord(hex).toRgb();
    const upper = hex.toUpperCase();
    if (multiple) {
      const on = ticked.includes(upper);
      return (
        <Grid.Item
          key={key}
          id={key}
          title={title}
          content={{ color: hex }}
          accessory={on ? { icon: Icon.CheckCircle, tooltip: "Ticked" } : undefined}
          actions={
            <ActionPanel>
              <Action
                title={on ? "Untick" : "Tick"}
                icon={on ? Icon.Circle : Icon.CheckCircle}
                onAction={() => toggle(upper)}
              />
              {multiple.applies ? (
                multiple.applies.map((a) => (
                  <Action
                    key={a.title}
                    title={ticked.length ? `${a.title} (${ticked.length})` : a.title}
                    icon={a.icon}
                    shortcut={a.shortcut}
                    onAction={() =>
                      ticked.length
                        ? a.run(ticked)
                        : showToast({ style: Toast.Style.Failure, title: "Tick at least one color first" })
                    }
                  />
                ))
              ) : (
                <Action
                  title={
                    multiple.saveLabel
                      ? `${multiple.saveLabel} (${ticked.length})`
                      : ticked.length
                        ? `Save ${ticked.length} Color Tag${ticked.length > 1 ? "s" : ""}`
                        : "Clear Custom Tags"
                  }
                  icon={Icon.SaveDocument}
                  onAction={save}
                />
              )}
              <Action.CopyToClipboard title="Copy Hex Color" content={hex} shortcut={Keyboard.Shortcut.Common.Copy} />
            </ActionPanel>
          }
        />
      );
    }
    return (
      <Grid.Item
        key={key}
        id={key}
        title={title}
        content={{ color: hex }}
        actions={
          <ActionPanel>
            <Action
              title="Set Color"
              onAction={() => {
                setColor?.(value);
                pop();
              }}
            />
            <Action title="Test Color" onAction={() => setColor?.(value)} />
            <Action.CopyToClipboard title="Copy Hex Color" content={hex} shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <Grid
      navigationTitle={multiple?.title}
      columns={8}
      aspectRatio="16/9"
      inset={Grid.Inset.Zero}
      fit={Grid.Fit.Fill}
      filtering={false}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Hex (#FFE0B0) or a color word (peach)…"
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Amount of Colors"
          storeValue={true}
          onChange={(newValue) => {
            if (!newValue) return;
            setAmountOfColors(parseInt(newValue, 10));
          }}
        >
          <Grid.Dropdown.Section title="Colors">
            <Grid.Dropdown.Item value={"16"} title="16 colors" />
            <Grid.Dropdown.Item value={"32"} title="32 colors" />
            <Grid.Dropdown.Item value={"64"} title="64 colors" />
            <Grid.Dropdown.Item value={"128"} title="128 colors" />
            <Grid.Dropdown.Item value={"256"} title="256 colors" />
            <Grid.Dropdown.Item value={"360"} title="360 colors" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {search.trim() ? (
        <>
          <Grid.Section title="Results" subtitle={multiple?.hint}>
            {results.map(renderTile)}
          </Grid.Section>
          {results.length === 0 ? <Grid.EmptyView title="No matching color" /> : null}
        </>
      ) : (
        <>
          {multiple ? (
            // Always shown in tick mode, so the explainer sits on its own section, not on Whites.
            // Raycast hides empty sections, hence the placeholder tile.
            <Grid.Section
              title={
                ticked.length
                  ? `Ticked (${ticked.length})${multiple.applies ? " — ⌘↵ split · ⌘⇧↵ gradient" : " — ⌘↵ to save"}`
                  : "Ticked"
              }
              subtitle={multiple.hint}
            >
              {ticked.length ? (
                ticked.map((hex) => renderTile({ key: `ticked-${hex}`, title: hex, hex }))
              ) : (
                <Grid.Item
                  key="nothing-ticked"
                  content={{ source: "placeholder.svg" }}
                  accessory={{ icon: Icon.Info, tooltip: "Colors you tick appear here" }}
                />
              )}
            </Grid.Section>
          ) : null}
          <Grid.Section title="Colors">{colorValues(amountOfColors).map(renderTile)}</Grid.Section>
        </>
      )}
    </Grid>
  );
};

export default SetColorGrid;
