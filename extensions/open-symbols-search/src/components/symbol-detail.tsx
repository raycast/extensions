import { Color, Detail, environment } from "@raycast/api";
import { useMemo } from "react";
import { pathToFileURL } from "url";
import { getCatalog, variantsOf, OpenSymbol, websiteUrl } from "../lib/data";
import { useSymbolState } from "../lib/state";
import { usePreviews } from "../lib/use-previews";
import { SymbolActions } from "./symbol-actions";

export function SymbolDetail({ symbol }: { symbol: OpenSymbol }) {
  const state = useSymbolState();
  const list = useMemo(() => [symbol], [symbol]);
  const strip = usePreviews(list, "strip");
  const preview = strip.get(symbol);
  const failed = strip.hasFailed(symbol);

  const image = preview ? (environment.appearance === "dark" ? preview.dark : preview.light) : undefined;
  const markdown = [
    `## ${symbol.xcodeName}`,
    image
      ? `![All nine weights of ${symbol.xcodeName}](${pathToFileURL(image).href}?raycast-height=150)`
      : failed
        ? "_Couldn't download this symbol's template. Check your connection and try again._"
        : "_Rendering weights…_",
    "",
    "```swift",
    `Image("${symbol.xcodeName}")`,
    "    .font(.title)",
    `    .fontWeight(.${state.weight === "ultralight" ? "ultraLight" : state.weight})`,
    "```",
  ].join("\n");

  const variants = variantsOf(symbol);

  return (
    <Detail
      navigationTitle={symbol.xcodeName}
      isLoading={!preview && !failed}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={symbol.name} />
          <Detail.Metadata.Label title="Xcode Name" text={symbol.xcodeName} />
          <Detail.Metadata.Label title="Library" text={symbol.library.name} />
          <Detail.Metadata.Label title="License" text={symbol.library.license} />
          <Detail.Metadata.Label title="Style" text={symbol.isFill ? "Fill" : "Outline"} />
          {variants.length > 1 && (
            <Detail.Metadata.Label title="Variants" text={variants.map((v) => v.name).join(", ")} />
          )}
          {state.isPinned(symbol) && <Detail.Metadata.Label title="Pinned" text="Yes" />}
          {symbol.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {symbol.tags.slice(0, 16).map((t) => (
                <Detail.Metadata.TagList.Item key={t} text={t} color={Color.SecondaryText} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Open Symbols Release" text={getCatalog().ref} />
          <Detail.Metadata.Link title="Open Symbols" target={websiteUrl(symbol)} text="View on opensymbols.dev" />
        </Detail.Metadata>
      }
      actions={
        <SymbolActions symbol={symbol} state={state} isDetail onRetryPreviews={failed ? strip.retry : undefined} />
      }
    />
  );
}
