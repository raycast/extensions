import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  copyTextForEntry,
  counts,
  searchGlyphs,
  totalCount,
  type GlyphEntry,
  type GlyphKind,
  type GlyphKindFilter,
  type SearchResult,
  type SymbolEntry,
} from "./search";
import { renderSFSymbolIcons, sfSymbolIcon } from "./sf-symbol-icons";

const kindFilterOptions: { value: GlyphKindFilter; title: string }[] = [
  { value: "all", title: "All Types" },
  { value: "symbol", title: "SF Symbols" },
  { value: "emoji", title: "Emoji" },
  { value: "unicode", title: "Unicode" },
];
const sectionTitles: Record<GlyphKind, string> = {
  symbol: "SF Symbols",
  emoji: "Emoji",
  unicode: "Unicode",
};

function swiftUIImageSnippet(symbolName: string): string {
  return `Image(systemName: "${symbolName}")`;
}

function uiKitSnippet(symbolName: string): string {
  return `UIImage(systemName: "${symbolName}")`;
}

function appKitSnippet(symbolName: string): string {
  return `NSImage(systemSymbolName: "${symbolName}", accessibilityDescription: nil)`;
}

function codePointSequence(text: string): string {
  return Array.from(text)
    .map((character) => `U+${character.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`)
    .join(" ");
}

function titleCaseUnicodeName(name: string): string {
  return name
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (word.length <= 1) {
        return word.toUpperCase();
      }
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function titleForEntry(entry: GlyphEntry): string {
  switch (entry.kind) {
    case "symbol":
      return entry.name;
    case "emoji":
      return entry.name;
    case "unicode":
      return titleCaseUnicodeName(entry.name);
  }
}

function subtitleForEntry(entry: GlyphEntry): string {
  switch (entry.kind) {
    case "symbol":
      return entry.aliases.length > 0 ? entry.aliases.slice(0, 5).join(", ") : entry.primaryCategory;
    case "emoji":
      return entry.group;
    case "unicode":
      return `${entry.codePointLabel} · ${entry.generalCategory}`;
  }
}

function accessoryForEntry(entry: GlyphEntry): List.Item.Props["accessories"] {
  switch (entry.kind) {
    case "symbol":
      return [{ text: entry.primaryCategory, tooltip: entry.categoryNames.join(", ") || "SF Symbol" }];
    case "emoji":
      return [];
    case "unicode":
      return unicodePreview(entry).map((preview) => ({ text: preview, tooltip: entry.codePointLabel }));
  }
}

function iconForEntry(entry: GlyphEntry, renderedSymbolIconPaths: Record<string, string>): List.Item.Props["icon"] {
  switch (entry.kind) {
    case "symbol":
      return sfSymbolIcon(entry.name, renderedSymbolIconPaths);
    case "emoji":
      return entry.character;
    case "unicode":
      return undefined;
  }
}

function unicodePreview(entry: Extract<GlyphEntry, { kind: "unicode" }>): string[] {
  if (entry.category === "formatOther" || entry.category === "separators" || entry.category === "marks") {
    return [];
  }
  return [entry.character];
}

function keywordsForEntry(entry: GlyphEntry): string[] {
  switch (entry.kind) {
    case "symbol":
      return [entry.name, ...entry.aliases, ...entry.categoryNames];
    case "emoji":
      return [entry.character, entry.name, entry.group, entry.slug.replaceAll("_", " ")];
    case "unicode":
      return [
        entry.character,
        entry.name,
        entry.codePoint,
        entry.codePointLabel,
        entry.categoryName,
        entry.generalCategory,
        ...entry.aliases,
      ];
  }
}

function CopyValueActions({ entry }: { entry: GlyphEntry }) {
  const copyText = copyTextForEntry(entry);
  const copyTitle = entry.kind === "symbol" ? "Copy Symbol Name" : "Copy Character";
  return (
    <>
      <Action.CopyToClipboard title={copyTitle} content={copyText} />
      <Action.Paste title={entry.kind === "symbol" ? "Paste Symbol Name" : "Paste Character"} content={copyText} />
    </>
  );
}

function SymbolCodeActions({ entry }: { entry: SymbolEntry }) {
  return (
    <ActionPanel.Section title="Code">
      <Action.CopyToClipboard title="Copy SwiftUI Snippet" content={swiftUIImageSnippet(entry.name)} />
      <Action.CopyToClipboard title="Copy UIKit Snippet" content={uiKitSnippet(entry.name)} />
      <Action.CopyToClipboard title="Copy AppKit Snippet" content={appKitSnippet(entry.name)} />
    </ActionPanel.Section>
  );
}

function CodePointActions({ entry }: { entry: Exclude<GlyphEntry, SymbolEntry> }) {
  return (
    <ActionPanel.Section title="Unicode">
      <Action.CopyToClipboard title="Copy Code Point" content={codePointSequence(entry.character)} />
    </ActionPanel.Section>
  );
}

function GlyphActions({ entry }: { entry: GlyphEntry }) {
  return (
    <ActionPanel>
      <CopyValueActions entry={entry} />
      {entry.kind === "symbol" ? <SymbolCodeActions entry={entry} /> : <CodePointActions entry={entry} />}
    </ActionPanel>
  );
}

function GlyphSection({
  kind,
  results,
  renderedSymbolIconPaths,
}: {
  kind: GlyphKind;
  results: SearchResult[];
  renderedSymbolIconPaths: Record<string, string>;
}) {
  if (results.length === 0) {
    return null;
  }
  return (
    <List.Section title={sectionTitles[kind]}>
      {results.map(({ entry }) => (
        <List.Item
          key={`${entry.kind}:${copyTextForEntry(entry)}:${titleForEntry(entry)}`}
          title={titleForEntry(entry)}
          subtitle={subtitleForEntry(entry)}
          keywords={keywordsForEntry(entry)}
          icon={iconForEntry(entry, renderedSymbolIconPaths)}
          accessories={accessoryForEntry(entry)}
          actions={<GlyphActions entry={entry} />}
        />
      ))}
    </List.Section>
  );
}

function resultsForKind(results: SearchResult[], kind: GlyphKind): SearchResult[] {
  return results.filter((result) => result.entry.kind === kind);
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [kindFilter, setKindFilter] = useState<GlyphKindFilter>("all");
  const [renderedSymbolIconPaths, setRenderedSymbolIconPaths] = useState<Record<string, string>>({});
  const results = useMemo(() => searchGlyphs(searchText, kindFilter), [kindFilter, searchText]);
  const kindsToShow: GlyphKind[] = kindFilter === "all" ? ["symbol", "emoji", "unicode"] : [kindFilter];
  const missingSymbolIconNames = useMemo(() => {
    return [
      ...new Set(
        results.flatMap((result) =>
          result.entry.kind === "symbol" && !renderedSymbolIconPaths[result.entry.name] ? [result.entry.name] : [],
        ),
      ),
    ];
  }, [renderedSymbolIconPaths, results]);

  useEffect(() => {
    if (missingSymbolIconNames.length === 0) {
      return;
    }

    let isCancelled = false;
    renderSFSymbolIcons(missingSymbolIconNames).then((iconPaths) => {
      if (isCancelled || Object.keys(iconPaths).length === 0) {
        return;
      }
      setRenderedSymbolIconPaths((current) => ({ ...current, ...iconPaths }));
    });

    return () => {
      isCancelled = true;
    };
  }, [missingSymbolIconNames]);

  return (
    <List
      filtering={false}
      navigationTitle="Search Glyphs"
      searchBarPlaceholder={`Search ${totalCount.toLocaleString()} symbols, emoji, and Unicode characters`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by type"
          value={kindFilter}
          onChange={(value) => setKindFilter(value as GlyphKindFilter)}
        >
          {kindFilterOptions.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown>
      }
      onSearchTextChange={setSearchText}
      throttle
    >
      {kindsToShow.map((kind) => (
        <GlyphSection
          key={kind}
          kind={kind}
          results={resultsForKind(results, kind)}
          renderedSymbolIconPaths={renderedSymbolIconPaths}
        />
      ))}
      {results.length === 0 ? (
        <List.EmptyView
          title="No Matching Glyphs"
          description={`Searches ${counts.symbol.toLocaleString()} SF Symbols, ${counts.emoji.toLocaleString()} emoji, and ${counts.unicode.toLocaleString()} Unicode characters.`}
        />
      ) : null}
    </List>
  );
}
