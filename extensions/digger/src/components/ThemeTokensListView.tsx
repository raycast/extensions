import { useEffect, useState } from "react";
import { Action, ActionPanel, Color, Grid, Icon, Keyboard, List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { ThemeColor, ThemeData } from "../types";
import { LIMITS } from "../utils/config";
import { fetchStylesheetTokens } from "../utils/themeUtils";
import { swatchFor } from "./Theme";

interface ThemeTokensListViewProps {
  theme: ThemeData;
  /** Every stylesheet the page links, already absolute. */
  stylesheetUrls: string[];
  /** The dug URL — the reference the network guard judges cross-origin against. */
  pageUrl: string;
}

interface DeepScan {
  tokens: ThemeColor[];
  scanned: number;
  unchecked: number;
  truncated: boolean;
}

function tokenAccessories(token: ThemeColor): List.Item.Accessory[] {
  return [
    { text: token.value },
    { tag: { value: token.source === "stylesheet" ? "CSS" : "Markup", color: Color.SecondaryText } },
  ];
}

/**
 * The full palette.
 *
 * The dig reads three stylesheets to keep itself fast; primer.style links 29 and
 * raycast.com 5, so the section's list is a sample and says so. Opening this view
 * is the user asking for the rest, so it re-scans every linked sheet with the
 * deep limits. The tokens already found render immediately and the rest arrive
 * underneath — an empty list behind a spinner would be a worse trade than a
 * partial one that fills in.
 */
type ViewMode = "list" | "grid";

/**
 * Tile for a token whose colour could not be resolved.
 *
 * `Icon.Circle` draws a small glyph centred in an otherwise empty cell, which is
 * exactly what made a grid of unresolved tokens look broken. An SVG data URI is
 * rendered as an image and fills the tile the way a colour swatch does — the
 * same technique the color-hunt extension uses for its multi-band palette tiles.
 */
/** Grid titles drop the `--` prefix; the name itself is unchanged everywhere else. */
function gridTitle(token: ThemeColor): string {
  const name = token.name ?? token.value;
  return name.startsWith("--") ? name.slice(2) : name;
}

/** A tintable 6-digit hex, or undefined when the colour is translucent or unresolved. */
function opaqueHex(token: ThemeColor): string | undefined {
  const hex = token.hex;
  if (!hex) return undefined;
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  if (/^#[0-9a-f]{8}$/i.test(hex)) return hex.slice(6).toLowerCase() === "ff" ? hex.slice(0, 7) : undefined;
  return undefined;
}

const UNRESOLVED_TILE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">` +
      `<defs><pattern id="d" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
      `<rect width="8" height="8" fill="#88888844"/><rect width="4" height="8" fill="#88888899"/></pattern></defs>` +
      `<rect width="40" height="40" rx="6" fill="url(#d)"/></svg>`,
  );

function TokenActions({
  token,
  all,
  viewMode,
  setViewMode,
}: {
  token: ThemeColor;
  all: ThemeColor[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Value" content={token.value} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action.CopyToClipboard title="Copy Name" content={token.name ?? token.value} />
      {token.hex && token.hex !== token.value && <Action.CopyToClipboard title="Copy Hex" content={token.hex} />}
      <Action.CopyToClipboard title="Copy Declaration" content={`${token.name ?? "--token"}: ${token.value};`} />
      <ActionPanel.Section title="View">
        {viewMode === "list" ? (
          <Action
            title="View as Grid"
            icon={Icon.AppWindowGrid3x3}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "g" },
              Windows: { modifiers: ["ctrl"], key: "g" },
            }}
            onAction={() => setViewMode("grid")}
          />
        ) : (
          <Action
            title="View as List"
            icon={Icon.List}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "l" },
              Windows: { modifiers: ["ctrl"], key: "l" },
            }}
            onAction={() => setViewMode("list")}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy All as CSS"
          icon={Icon.Code}
          content={`:root {\n${all.map((t) => `  ${t.name}: ${t.value};`).join("\n")}\n}`}
        />
        <Action.CopyToClipboard
          title="Copy All as JSON"
          icon={Icon.Code}
          content={JSON.stringify(Object.fromEntries(all.map((t) => [t.name ?? t.value, t.hex ?? t.value])), null, 2)}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function ThemeTokensListView({ theme, stylesheetUrls, pageUrl }: ThemeTokensListViewProps) {
  const [deep, setDeep] = useState<DeepScan | undefined>();
  const [viewMode, setViewMode] = useCachedState<ViewMode>("theme-token-view", "list");
  const [isScanning, setIsScanning] = useState(stylesheetUrls.length > 0);
  // Identity key: the prop is rebuilt on every parent render, so depending on the
  // array itself would restart the scan each time Theme re-renders.
  const urlKey = stylesheetUrls.join("\n");

  useEffect(() => {
    const urls = urlKey === "" ? [] : urlKey.split("\n");
    if (urls.length === 0) return;
    const controller = new AbortController();

    fetchStylesheetTokens(urls, pageUrl, controller.signal, {
      maxSheets: LIMITS.MAX_STYLESHEETS_DEEP,
      maxTokens: LIMITS.MAX_THEME_TOKENS_DEEP,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setDeep({
          tokens: result.tokens,
          scanned: result.scanned,
          unchecked: result.unchecked,
          truncated: result.truncated,
        });
      })
      // fetchStylesheetTokens absorbs per-sheet failures into `unchecked` and
      // does not reject; this only catches an abort on unmount.
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setIsScanning(false);
      });

    return () => controller.abort();
  }, [urlKey, pageUrl]);

  // Two rules, in this order, and the order is the whole point.
  //
  // 1. SOURCE WINS. A markup declaration is specific to this page and beats a
  //    stylesheet one — even when the markup value cannot be resolved. A page
  //    that sets `--brand: Canvas` inline has not been overruled by a shared
  //    stylesheet that happens to say `#ff0000`; resolving is not precedence.
  // 2. WITHIN one source, prefer the token that actually resolved. This is what
  //    repairs a cache entry written before `hex` existed: the deep scan returns
  //    the same declaration with a colour attached, and a name-only "already
  //    seen" check discarded it, which is why every grid tile was a hatch.
  const rank = (token: ThemeColor) => (token.source === "stylesheet" ? 0 : 1);
  const byName = new Map<string | undefined, ThemeColor>();
  for (const token of [...theme.tokens, ...(deep?.tokens ?? [])]) {
    const existing = byName.get(token.name);
    if (!existing) {
      byName.set(token.name, token);
      continue;
    }
    if (rank(token) > rank(existing)) byName.set(token.name, token);
    else if (rank(token) === rank(existing) && !existing.hex && token.hex) byName.set(token.name, token);
  }
  const merged: ThemeColor[] = [...byName.values()];

  const markup = merged.filter((t) => t.source !== "stylesheet");
  const fromCss = merged.filter((t) => t.source === "stylesheet");
  const sections: Array<[string, ThemeColor[]]> = [
    ["Declared in Markup", markup],
    ["Declared in Stylesheets", fromCss],
  ];

  const sheetSummary = deep
    ? `${deep.scanned} of ${stylesheetUrls.length} stylesheets`
    : isScanning
      ? `reading ${stylesheetUrls.length} stylesheets…`
      : undefined;

  const navigationTitle = isScanning ? "Color Tokens — scanning…" : `Color Tokens (${merged.length})`;
  const placeholder = `Search ${merged.length} color tokens`;
  const actionsFor = (token: ThemeColor) => (
    <TokenActions token={token} all={merged} viewMode={viewMode} setViewMode={setViewMode} />
  );

  // A palette is a visual object, so the grid is the better default for reading
  // one — but the list is the better one for finding a token by name, which is
  // why both exist rather than one replacing the other.
  if (viewMode === "grid") {
    return (
      <Grid
        isLoading={isScanning}
        // No `inset`. Inset is padding INSIDE the tile, so a swatch drawn with it
        // floats in a bordered cell instead of filling it — that is the whole
        // visual difference from the color-shades grid, which passes none.
        //
        // `columns` is capped at 8 by the API, so six is a deliberate choice, not
        // the maximum: these titles are CSS custom-property names rather than
        // color-shades' two-character step numbers, and eight columns truncated
        // every one of them to `--color-lim…`.
        columns={6}
        navigationTitle={navigationTitle}
        searchBarPlaceholder={placeholder}
      >
        {sections.map(([title, items]) =>
          items.length === 0 ? null : (
            <Grid.Section
              key={title}
              title={title}
              subtitle={
                title.includes("Stylesheets") && sheetSummary ? `${items.length} · ${sheetSummary}` : `${items.length}`
              }
            >
              {items.map((token) => (
                <Grid.Item
                  key={`${token.source}-${token.name}`}
                  // `opaqueHex` is undefined for a translucent colour: Raycast tints
                  // have no alpha, so showing one as its opaque RGB would display a
                  // colour the site does not use.
                  content={
                    opaqueHex(token)
                      ? { color: { light: opaqueHex(token)!, dark: opaqueHex(token)!, adjustContrast: false } }
                      : { source: UNRESOLVED_TILE }
                  }
                  // The leading `--` is on every token and identifies none of
                  // them, so it is two characters of truncation budget spent on
                  // nothing. The full name is still what search matches, and
                  // Copy Name still yields it verbatim.
                  title={gridTitle(token)}
                  subtitle={token.hex ?? "unresolved"}
                  keywords={[token.value, token.name ?? ""]}
                  actions={actionsFor(token)}
                />
              ))}
            </Grid.Section>
          ),
        )}
        <Grid.EmptyView
          icon={Icon.Swatch}
          title={isScanning ? "Reading Stylesheets…" : "No Matches"}
          description={isScanning ? "Color tokens will appear as they are found." : "No token matches your search."}
        />
      </Grid>
    );
  }

  return (
    <List isLoading={isScanning} navigationTitle={navigationTitle} searchBarPlaceholder={placeholder}>
      {sections.map(([title, items]) =>
        items.length === 0 ? null : (
          <List.Section
            key={title}
            title={title}
            subtitle={
              title.includes("Stylesheets") && sheetSummary ? `${items.length} · ${sheetSummary}` : `${items.length}`
            }
          >
            {items.map((token) => (
              <List.Item
                key={`${token.source}-${token.name}`}
                title={token.name ?? token.value}
                subtitle={token.hex && token.hex !== token.value ? token.value : undefined}
                icon={swatchFor(token.value, token.hex)}
                accessories={tokenAccessories(token)}
                actions={actionsFor(token)}
              />
            ))}
          </List.Section>
        ),
      )}

      {/* A capped list is a sample, and saying so is the difference between
          "this is the palette" and "this is 2,000 of them". */}
      {deep?.truncated && (
        <List.Section title="Note">
          <List.Item
            title="List is capped"
            icon={{ source: Icon.Info, tintColor: Color.Orange }}
            subtitle="This page declares more tokens than are shown here"
          />
        </List.Section>
      )}
      {deep && deep.unchecked > 0 && (
        <List.Section title="Couldn't Check">
          <List.Item
            title={`${deep.unchecked} stylesheet${deep.unchecked === 1 ? "" : "s"} could not be read`}
            icon={{ source: Icon.QuestionMarkCircle, tintColor: Color.Orange }}
            subtitle="Their tokens are unknown, not absent"
          />
        </List.Section>
      )}

      <List.EmptyView
        icon={Icon.Swatch}
        title={isScanning ? "Reading Stylesheets…" : "No Matches"}
        description={isScanning ? "Color tokens will appear as they are found." : "No token matches your search."}
      />
    </List>
  );
}
