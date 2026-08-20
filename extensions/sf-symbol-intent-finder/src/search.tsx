import {
  Action,
  ActionPanel,
  Color,
  Grid,
  Icon,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { ReactElement, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { hasLocalIcon, localIconPath, refreshGlyphsInBackground, renderIcons } from "./catalog";
import { iosAvailability, imageURL, searchSymbols, SFSymbol, SYMBOLS } from "./data";
import { intentSearch, MissingKeyError } from "./gemini";

const GRID_COLUMNS = 8;
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;
// Cap rendered tiles: mounting all ~9k items (each with a remote image + action
// panel) exhausts the Raycast worker's heap. Ranked results mean the cap keeps the
// most relevant matches; AI suggestions are always appended on top of the cap.
const RESULT_LIMIT = 250;
// Background icon backfill batch size; small enough to let visible-result
// renders interleave between batches.
const BACKFILL_CHUNK = 400;

type PrimaryAction = "copySymbol" | "pasteSymbol" | "copyName" | "pasteName";

interface Preferences {
  geminiApiKey?: string;
  primaryAction: PrimaryAction;
  model?: string;
}

export default function Command() {
  const { geminiApiKey, primaryAction, model } = getPreferenceValues<Preferences>();
  const apiKey = geminiApiKey?.trim() ?? "";
  const modelId = model?.trim() || "gemini-3.1-flash-lite";

  const [searchText, setSearchText] = useState("");
  // AI results are tagged with the query that produced them, so stale results from
  // a previous query are never shown after the search text changes.
  const [aiResult, setAiResult] = useState<{ query: string; symbols: SFSymbol[] }>({ query: "", symbols: [] });
  const [aiLoading, setAiLoading] = useState(false);
  const requestId = useRef(0);

  const localResults = useMemo(() => searchSymbols(searchText), [searchText]);
  const query = searchText.trim();

  // Parallel AI intent search, debounced and validated against the catalog.
  useEffect(() => {
    if (query.length < MIN_QUERY_LENGTH || !apiKey) {
      setAiLoading(false);
      return;
    }

    // Show the loading state immediately (covers the debounce window too).
    setAiLoading(true);
    const controller = new AbortController();
    const id = ++requestId.current;
    const handle = setTimeout(async () => {
      try {
        const results = await intentSearch(query, apiKey, modelId, controller.signal);
        if (id === requestId.current) setAiResult({ query, symbols: results });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (id === requestId.current) setAiResult({ query, symbols: [] });
        if (!(error instanceof MissingKeyError)) {
          await showToast({ style: Toast.Style.Failure, title: "AI intent search failed", message: String(error) });
        }
      } finally {
        if (id === requestId.current) setAiLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [query, apiKey, modelId]);

  // Merge local + AI results, de-duped, local first (stable ordering as AI fills in).
  // Local results are capped to keep the worker within its memory budget; AI matches
  // are appended on top so they surface even when they rank past the cap locally.
  // Only use AI results that belong to the current query.
  const merged = useMemo(() => {
    const capped = localResults.slice(0, RESULT_LIMIT);
    const seen = new Set(capped.map((s) => s.name));
    const ai = aiResult.query === query ? aiResult.symbols : [];
    const extra = ai.filter((s) => !seen.has(s.name));
    return [...capped, ...extra];
  }, [localResults, aiResult, query]);

  // Icons are rendered by the user's own macOS into a local cache (see
  // catalog.ts); bumping this epoch re-renders the grid to pick fresh ones up.
  const [, bumpIconEpoch] = useReducer((epoch: number) => epoch + 1, 0);

  // Render icons for the visible results first…
  useEffect(() => {
    let cancelled = false;
    const missing = merged.filter((s) => !hasLocalIcon(s.name)).map((s) => s.name);
    if (missing.length === 0) return;
    void renderIcons(missing).then((rendered) => {
      if (!cancelled && rendered > 0) bumpIconEpoch();
    });
    return () => {
      cancelled = true;
    };
  }, [merged]);

  // …then quietly backfill the whole catalog, and refresh the glyph-char cache,
  // so the extension keeps itself current without updates.
  useEffect(() => {
    refreshGlyphsInBackground();
    let cancelled = false;
    void (async () => {
      const names = SYMBOLS.map((s) => s.name);
      for (let i = 0; i < names.length && !cancelled; i += BACKFILL_CHUNK) {
        await renderIcons(names.slice(i, i + BACKFILL_CHUNK));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showKeyHint = !apiKey && query.length >= MIN_QUERY_LENGTH;
  // Show a "more coming" tile only while the AI call for the current query is pending.
  const showLoadingTile = aiLoading && aiResult.query !== query;

  return (
    <Grid
      columns={GRID_COLUMNS}
      inset={Grid.Inset.Large}
      filtering={false}
      isLoading={aiLoading}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search SF Symbols by name or intent (e.g. undo, share, danger)…"
    >
      {showKeyHint && (
        <Grid.Item
          content={{ source: Icon.Stars, tintColor: Color.Yellow }}
          title="Add a Gemini API key"
          subtitle="Enables AI intent search"
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser title="Get a Free Key" url="https://aistudio.google.com/apikey" />
            </ActionPanel>
          }
        />
      )}
      {merged.map((symbol) => (
        <SymbolItem key={symbol.name} symbol={symbol} primaryAction={primaryAction} />
      ))}
      {showLoadingTile && (
        <Grid.Item
          key="__ai_loading__"
          content={{ source: Icon.Stars, tintColor: Color.SecondaryText }}
          title="Searching…"
          subtitle="AI"
        />
      )}
    </Grid>
  );
}

function SymbolItem({ symbol, primaryAction }: { symbol: SFSymbol; primaryAction: PrimaryAction }) {
  return (
    <Grid.Item
      title={symbol.name}
      subtitle={iosAvailability(symbol)}
      content={{
        value: {
          source: hasLocalIcon(symbol.name) ? localIconPath(symbol.name) : imageURL(symbol.name),
          fallback: Icon.Warning,
          tintColor: Color.PrimaryText,
        },
        tooltip: symbol.name,
      }}
      keywords={symbol.searchTerms.concat(symbol.categories)}
      actions={<SymbolActions symbol={symbol} primaryAction={primaryAction} />}
    />
  );
}

function SymbolActions({ symbol, primaryAction }: { symbol: SFSymbol; primaryAction: PrimaryAction }) {
  const actions: Record<PrimaryAction, ReactElement> = {
    pasteSymbol: (
      <Action.Paste
        key="pasteSymbol"
        title="Paste Symbol"
        content={symbol.symbol}
        shortcut={{ modifiers: ["opt", "shift"], key: "v" }}
      />
    ),
    copySymbol: (
      <Action.CopyToClipboard
        key="copySymbol"
        title="Copy Symbol"
        content={symbol.symbol}
        shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
      />
    ),
    copyName: (
      <Action.CopyToClipboard
        key="copyName"
        title="Copy Name"
        content={symbol.name}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    ),
    pasteName: (
      <Action.Paste
        key="pasteName"
        title="Paste Name"
        content={symbol.name}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
      />
    ),
  };

  // Glyph chars aren't available for the newest symbols; hide the symbol-glyph
  // actions for those, but always keep the name actions.
  const hasGlyph = symbol.symbol.length > 0;
  const order: PrimaryAction[] = ["pasteSymbol", "copySymbol", "copyName", "pasteName"];
  const available = order.filter((a) => hasGlyph || (a !== "pasteSymbol" && a !== "copySymbol"));

  // Configurable primary action: the chosen one is first (Enter); the rest keep
  // the screenshot order. Falls back gracefully when the chosen primary needs a glyph.
  const ordered = available.includes(primaryAction)
    ? [primaryAction, ...available.filter((a) => a !== primaryAction)]
    : available;

  return <ActionPanel title={symbol.name}>{ordered.map((a) => actions[a])}</ActionPanel>;
}
