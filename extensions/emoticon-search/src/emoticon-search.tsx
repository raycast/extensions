import { Action, ActionPanel, Grid, Icon, Keyboard } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import categories from "./emoticons.json";

type Emoticon = { name: string; symbol: string };
type Usage = Emoticon & { count: number; lastUsed: number };

const DEFAULT_COLUMNS = 5;
// Rendering all ~3,400 cells at once blows Raycast's 100 MB memory limit, so they load a page at a time as
// you scroll. Scrolling through everything still renders it all; show one category at a time if that bites.
const PAGE_SIZE = 150;
const WEEK = 7 * 24 * 60 * 60 * 1000;

// Use count, halved for every week since last use, so old favourites fade out.
const frecency = (u: Usage) => u.count * 0.5 ** ((Date.now() - u.lastUsed) / WEEK);

// ⌘ on macOS, Ctrl on Windows, same keys as Emoji Search.
const cmd = (key: Keyboard.KeyEquivalent): Keyboard.Shortcut => ({
  macOS: { modifiers: ["cmd"], key },
  Windows: { modifiers: ["ctrl"], key },
});

// Grid cells only show images, so the emoticon is drawn as text in an SVG.
// Long emoticons get a smaller font so they fit (combining marks don't take up width).
const toImage = (symbol: string, color: string) => {
  const text = symbol.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fontSize = Math.min(18, 140 / [...symbol.replace(/\p{M}/gu, "")].length);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="50" dominant-baseline="middle" text-anchor="middle" font-size="${fontSize}" fill="${color}">${text}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

const allEmoticons = categories.flatMap((c) => c.emoticons.map((e) => ({ ...e, category: c.title })));

export default function Command() {
  const [category, setCategory] = useState("");
  const [searchText, setSearchText] = useState("");
  const [pages, setPages] = useState(1);
  const [columns, setColumns] = useCachedState("columns", DEFAULT_COLUMNS);
  const [pinned, setPinned] = useCachedState<Emoticon[]>("pinned", []);
  const [usage, setUsage] = useCachedState<Record<string, Usage>>("usage", {});

  const isPinned = (emoticon: Emoticon) => pinned.some((e) => e.symbol === emoticon.symbol);
  const togglePin = ({ name, symbol }: Emoticon) =>
    setPinned((list) =>
      list.some((e) => e.symbol === symbol) ? list.filter((e) => e.symbol !== symbol) : [...list, { name, symbol }],
    );
  const recordUse = ({ name, symbol }: Emoticon) =>
    setUsage((u) => ({ ...u, [symbol]: { name, symbol, count: (u[symbol]?.count ?? 0) + 1, lastUsed: Date.now() } }));
  const resetRanking = ({ symbol }: Emoticon) =>
    setUsage((u) => Object.fromEntries(Object.entries(u).filter(([s]) => s !== symbol)));

  const frequentlyUsed = Object.values(usage)
    .filter((u) => !isPinned(u))
    .sort((a, b) => frecency(b) - frecency(a))
    .slice(0, columns * 2);

  // Search results are one list, ranked like Emoji Search: pinned, then frecency, then glyphy's order.
  const rank = (e: Emoticon) => (isPinned(e) ? Number.MAX_VALUE : usage[e.symbol] ? frecency(usage[e.symbol]) : 0);
  const query = searchText.toLowerCase();
  const words = query.split(/\s+/).filter(Boolean);
  const inCategory = allEmoticons.filter((e) => !category || e.category === category);
  const seen = new Set<string>();
  const cells = words.length
    ? inCategory
        // Typing or pasting part of a face finds it, as does every word of its name or category.
        .filter(
          (e) =>
            e.symbol.toLowerCase().includes(query) ||
            words.every((w) => `${e.name} ${e.category}`.toLowerCase().includes(w)),
        )
        .filter((e) => !seen.has(e.symbol) && seen.add(e.symbol))
        .sort((a, b) => rank(b) - rank(a))
        .map((e) => ({ ...e, section: "Results" }))
    : [
        ...pinned.map((e) => ({ ...e, section: "Pinned" })),
        ...frequentlyUsed.map((e) => ({ ...e, section: "Frequently Used" })),
        ...inCategory.map((e) => ({ ...e, section: e.category })),
      ];

  const sections = new Map<string, Emoticon[]>();
  for (const cell of cells.slice(0, pages * PAGE_SIZE)) {
    if (!sections.has(cell.section)) sections.set(cell.section, []);
    sections.get(cell.section)?.push(cell);
  }

  return (
    <Grid
      columns={columns}
      throttle
      onSearchTextChange={(text) => {
        setSearchText(text);
        setPages(1);
      }}
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: cells.length > pages * PAGE_SIZE,
        onLoadMore: () => setPages((p) => p + 1),
      }}
      searchBarPlaceholder="Search emoticons..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Select Category"
          onChange={(c) => {
            setCategory(c);
            setPages(1);
          }}
        >
          <Grid.Dropdown.Item title="All Emoticons" value="" />
          {categories.map((c) => (
            <Grid.Dropdown.Item key={c.title} title={c.title} value={c.title} />
          ))}
        </Grid.Dropdown>
      }
    >
      {[...sections].map(([title, emoticons]) => (
        <Grid.Section key={title} title={title}>
          {emoticons.map((e) => (
            <Grid.Item
              key={e.symbol}
              content={{ source: { light: toImage(e.symbol, "#000"), dark: toImage(e.symbol, "#fff") } }}
              title={e.name}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Paste content={e.symbol} onPaste={() => recordUse(e)} />
                    <Action.CopyToClipboard content={e.symbol} onCopy={() => recordUse(e)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title={isPinned(e) ? "Unpin Emoticon" : "Pin Emoticon"}
                      icon={isPinned(e) ? Icon.PinDisabled : Icon.Pin}
                      shortcut={cmd(".")}
                      onAction={() => togglePin(e)}
                    />
                    {usage[e.symbol] && (
                      <Action
                        title="Reset Ranking"
                        icon={Icon.ArrowCounterClockwise}
                        onAction={() => resetRanking(e)}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Zoom in"
                      icon={Icon.Plus}
                      shortcut={cmd("+")}
                      onAction={() => setColumns((c) => Math.max(3, c - 1))}
                    />
                    <Action
                      title="Zoom out"
                      icon={Icon.Minus}
                      shortcut={cmd("-")}
                      onAction={() => setColumns((c) => Math.min(8, c + 1))}
                    />
                    <Action
                      title="Reset Zoom"
                      icon={Icon.MagnifyingGlass}
                      shortcut={cmd("0")}
                      onAction={() => setColumns(DEFAULT_COLUMNS)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ))}
    </Grid>
  );
}
