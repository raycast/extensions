import { Action, ActionPanel, Clipboard, Detail, Grid, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  BLOCKS,
  type Block,
  GC_NAME,
  PLANES,
  blockByName,
  blockSize,
  charInfo,
  charsInBlock,
  copyFields,
  gcOf,
  parseCodePoint,
  planeOf,
  search,
} from "./lib/unicode";
import { glyphIcon, glyphImage } from "./lib/unicode-glyph";

const PAGE = 200;
const SEARCH_LIMIT = 200;

const hex4 = (cp: number) => cp.toString(16).toUpperCase().padStart(4, "0");
const rangeLabel = (b: Block) => `U+${hex4(b.start)}–U+${hex4(b.end)}`;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [blockName, setBlockName] = useState("Basic Latin");
  const [page, setPage] = useState(0);

  // Prefill from the clipboard if it holds a single character or a code point.
  useEffect(() => {
    (async () => {
      const clip = (await Clipboard.readText())?.trim();
      if (clip && (parseCodePoint(clip) !== null || [...clip].length === 1)) setSearchText(clip);
    })();
  }, []);

  const searching = searchText.trim().length > 0;
  const block = blockByName(blockName) ?? BLOCKS[0];

  const results = useMemo(() => (searching ? search(searchText, SEARCH_LIMIT) : null), [searchText, searching]);
  const browseCps = useMemo(
    () => (searching ? [] : charsInBlock(block, 0, (page + 1) * PAGE)),
    [searching, block, page],
  );

  const openBlock = (name: string) => {
    setBlockName(name);
    setSearchText("");
    setPage(0);
  };

  const pagination = searching
    ? undefined
    : { pageSize: PAGE, hasMore: (page + 1) * PAGE < blockSize(block), onLoadMore: () => setPage((p) => p + 1) };

  return (
    <Grid
      columns={8}
      inset={Grid.Inset.Small}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={(t) => {
        setSearchText(t);
        setPage(0);
      }}
      searchBarPlaceholder="Search by name, code point (U+1F600 · 2603), or paste a character"
      navigationTitle={
        searching && results ? `Unicode · ${results.blocks.length + results.chars.length} results` : "Unicode Browser"
      }
      pagination={pagination}
      searchBarAccessory={<BlockDropdown value={blockName} onChange={openBlock} />}
    >
      {searching && results ? (
        <>
          {results.blocks.length > 0 && (
            <Grid.Section title="Blocks">
              {results.blocks.map((b) => (
                <Grid.Item
                  key={`block-${b.name}`}
                  content={{ source: glyphIcon(b.start, gcOf(b.start)) }}
                  title={b.name}
                  subtitle={rangeLabel(b)}
                  actions={
                    <ActionPanel>
                      <Action title="Show Block" icon={Icon.AppWindowGrid2x2} onAction={() => openBlock(b.name)} />
                      <Action.CopyToClipboard title="Copy Block Name" content={b.name} />
                    </ActionPanel>
                  }
                />
              ))}
            </Grid.Section>
          )}
          {results.chars.length > 0 && (
            <Grid.Section title="Characters" subtitle={`${results.chars.length}`}>
              {results.chars.map((cp) => (
                <CharCell key={cp} cp={cp} />
              ))}
            </Grid.Section>
          )}
          {results.blocks.length === 0 && results.chars.length === 0 && (
            <Grid.EmptyView
              icon={Icon.MagnifyingGlass}
              title="No matches"
              description="Try a name (e.g. “snowman”), a code point (U+2603), or paste a character"
            />
          )}
        </>
      ) : (
        <Grid.Section title={block.name} subtitle={`${rangeLabel(block)} · ${blockSize(block)} code points`}>
          {browseCps.map((cp) => (
            <CharCell key={cp} cp={cp} />
          ))}
        </Grid.Section>
      )}
    </Grid>
  );
}

function CharCell({ cp }: { cp: number }) {
  const gc = gcOf(cp);
  return <Grid.Item content={{ source: glyphIcon(cp, gc) }} title={hex4(cp)} actions={<CharActions cp={cp} />} />;
}

function CharActions({ cp, showDetails = true }: { cp: number; showDetails?: boolean }) {
  const f = copyFields(cp);
  return (
    <ActionPanel>
      {f.isPrintable && <Action.CopyToClipboard title="Copy Character" content={f.char} />}
      {showDetails && (
        <Action.Push
          title="Show Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          target={<CharDetail cp={cp} />}
        />
      )}
      <Action.CopyToClipboard
        title="Copy Code Point"
        content={f.hex}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
      <Action.CopyToClipboard title="Copy Name" content={f.name} />
      <Action.CopyToClipboard title="Copy HTML Entity" content={f.htmlEntity} />
      <Action.CopyToClipboard title="Copy JS Escape" content={f.jsEscape} />
      {f.isPrintable && (
        <Action.Paste title="Paste Character" content={f.char} shortcut={{ modifiers: ["cmd"], key: "v" }} />
      )}
    </ActionPanel>
  );
}

function CharDetail({ cp }: { cp: number }) {
  const info = charInfo(cp);
  const meaning = [info.gcGroup, info.block, info.age ? `Added in Unicode ${info.age}` : null]
    .filter(Boolean)
    .join(" · ");
  const markdown = `![${info.hex}](${glyphImage(cp, info.gc)})\n\n# ${escapeMd(info.name)}\n\n${meaning}`;

  return (
    <Detail
      navigationTitle={`${info.hex} · ${info.name}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={info.name} />
          <Detail.Metadata.Label title="Code Point" text={info.hex} />
          <Detail.Metadata.Label title="Decimal" text={String(info.decimal)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Block" text={info.block} />
          <Detail.Metadata.Label title="Plane" text={info.plane} />
          <Detail.Metadata.TagList title="Category">
            <Detail.Metadata.TagList.Item text={`${info.gc} · ${GC_NAME[info.gc] ?? info.gcGroup}`} />
          </Detail.Metadata.TagList>
          {info.age && <Detail.Metadata.Label title="Unicode Version" text={info.age} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="HTML Entity" text={info.htmlEntity} />
          <Detail.Metadata.Label title="HTML (Decimal)" text={info.htmlDecEntity} />
          <Detail.Metadata.Label title="JS Escape" text={info.jsEscape} />
          {info.utf8 && <Detail.Metadata.Label title="UTF-8" text={info.utf8} />}
          {info.utf16 && <Detail.Metadata.Label title="UTF-16" text={info.utf16} />}
        </Detail.Metadata>
      }
      actions={<CharActions cp={cp} showDetails={false} />}
    />
  );
}

function BlockDropdown({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const groups = useMemo(() => {
    const byPlane = new Map<number, Block[]>();
    for (const b of BLOCKS) {
      const idx = planeOf(b.start).index;
      let arr = byPlane.get(idx);
      if (!arr) {
        arr = [];
        byPlane.set(idx, arr);
      }
      arr.push(b);
    }
    return [...byPlane.entries()].sort((a, b) => a[0] - b[0]);
  }, []);

  return (
    <Grid.Dropdown tooltip="Jump to block" value={value} onChange={onChange}>
      {groups.map(([idx, blocks]) => (
        <Grid.Dropdown.Section key={idx} title={`${idx}: ${PLANES[idx].name}`}>
          {blocks.map((b) => (
            <Grid.Dropdown.Item key={b.name} title={b.name} value={b.name} />
          ))}
        </Grid.Dropdown.Section>
      ))}
    </Grid.Dropdown>
  );
}

const escapeMd = (s: string) => s.replace(/([\\`*_{}[\]()#+\-.!|<>])/g, "\\$1");
