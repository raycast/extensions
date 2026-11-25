import { Color, Grid, Icon } from "@raycast/api";
import { OpenSymbol } from "../lib/data";
import { Preview } from "../lib/render";
import { GRID_COLUMNS, prefs, SymbolState, useSymbolState } from "../lib/state";
import { usePreviews } from "../lib/use-previews";
import { SymbolActions } from "./symbol-actions";

export function SymbolItem({
  symbol,
  preview,
  failed,
  state,
  showLibrary,
  section,
}: {
  symbol: OpenSymbol;
  preview?: Preview;
  failed?: boolean;
  state: SymbolState;
  showLibrary?: boolean;
  section: string;
}) {
  const showNames = prefs().showNames ?? true;
  const content = preview
    ? { source: { light: preview.light, dark: preview.dark } }
    : failed
      ? { source: Icon.ExclamationMark, tintColor: Color.SecondaryText }
      : { source: Icon.CircleProgress, tintColor: Color.SecondaryText };
  return (
    <Grid.Item
      id={`${section}:${symbol.key}`}
      content={{ value: content, tooltip: symbol.xcodeName }}
      title={showNames ? symbol.name : undefined}
      subtitle={showNames && showLibrary ? symbol.library.name : undefined}
      keywords={[symbol.library.name, ...symbol.tags]}
      accessory={state.isPinned(symbol) ? { icon: Icon.Tack, tooltip: "Pinned" } : undefined}
      actions={<SymbolActions symbol={symbol} state={state} />}
    />
  );
}

/** A small, fully loaded grid (used for "every library" and "outline and fill" views). */
export function SymbolGrid({
  title,
  symbols,
  showLibrary,
}: {
  title: string;
  symbols: OpenSymbol[];
  showLibrary?: boolean;
}) {
  const state = useSymbolState();
  const previews = usePreviews(symbols, state.weight);
  return (
    <Grid
      navigationTitle={title}
      columns={GRID_COLUMNS[state.gridSize]}
      inset={Grid.Inset.Small}
      isLoading={state.isLoading}
      searchBarPlaceholder="Filter symbols"
    >
      {symbols.map((s) => (
        <SymbolItem
          key={s.key}
          symbol={s}
          section="list"
          preview={previews.get(s)}
          failed={previews.hasFailed(s)}
          state={state}
          showLibrary={showLibrary}
        />
      ))}
    </Grid>
  );
}
