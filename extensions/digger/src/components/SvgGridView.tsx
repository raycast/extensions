import { useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Clipboard, Grid, Icon, Image, Keyboard } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { SvgActions } from "../actions/SvgActions";
import { detectBotProtection, getDeniedAccessMessage } from "../utils/botDetection";
import { LIMITS } from "../utils/config";
import { fetchFullPage } from "../utils/fetcher";
import { formatBytes } from "../utils/formatters";
import { getLogger } from "../utils/logger";
import { assetId, ensureQuickLook, quickLookPath } from "../utils/quickLook";
import { EMPTY_SPRITES, ExternalSpriteResult, loadExternalSprites, loadRemoteSvgs, RemoteSvg } from "../utils/svgFetch";
import {
  Backdrop,
  displaySafe,
  extractSvgs,
  isBackdrop,
  KnownSvg,
  mergeExternalSprites,
  SvgAsset,
  svgDataUri,
  SvgScan,
  SvgSource,
  themedThumbnail,
  withBackdrop,
} from "../utils/svgUtils";
import { redactUrlForLog, redactUrlsInText } from "../utils/urlUtils";

const log = getLogger("svg");

interface SvgGridViewProps {
  /** The page to scan: the dig's final URL, after redirects. */
  pageUrl: string;
  /** SVGs the dig found outside the HTML body — metadata and the manifest. */
  known: KnownSvg[];
}

/** Section order and titles. Inline first: it is what a page carries in the most volume. */
const SECTIONS: Array<{ source: SvgSource; title: string }> = [
  { source: "inline", title: "Inline" },
  { source: "sprite", title: "Sprite Symbols" },
  { source: "img", title: "Images" },
  { source: "object", title: "Embedded Files" },
  { source: "css", title: "CSS" },
  { source: "favicon", title: "Favicons" },
  { source: "meta", title: "Metadata & Manifest" },
];

type State =
  | { phase: "scanning" }
  | { phase: "failed"; message: string }
  | {
      phase: "ready";
      scan: SvgScan;
      /** The page was longer than LIMITS.MAX_PAGE_BYTES; only its start was scanned. */
      pageTruncated: boolean;
      /** Undefined while external sprite files are still being read. */
      sprites?: ExternalSpriteResult;
      /** File-backed SVGs downloaded for thumbnails; undefined while loading. */
      remote?: Map<string, RemoteSvg>;
    };

function subtitleFor(asset: SvgAsset, remote: Map<string, RemoteSvg> | undefined): string {
  let size: string;
  if (asset.markup !== undefined) size = formatBytes(asset.bytes);
  else if (remote === undefined) size = "File · loading…";
  else size = remote.get(asset.key) ? "File · couldn't load" : "File";
  if (asset.occurrences === 0) return `${size} · unused`;
  return asset.occurrences > 1 ? `${size} · ×${asset.occurrences}` : size;
}

/** A file-backed asset with the markup its thumbnail download produced. */
function withRemote(asset: SvgAsset, remote: Map<string, RemoteSvg> | undefined): SvgAsset {
  const got = asset.markup === undefined ? remote?.get(asset.key) : undefined;
  if (!got || !("markup" in got)) return asset;
  return { ...asset, markup: got.markup, bytes: Buffer.byteLength(got.markup, "utf8") };
}

/** The document head, or its first 64 KB. Challenge markers are judged where the dig judges them. */
function headOf(html: string): string {
  const end = html.search(/<\/head>/i);
  return end >= 0 ? html.slice(0, end) : html.slice(0, 64 * 1024);
}

/**
 * Every SVG the page's markup declares, on demand.
 *
 * The dig reads only `<head>`, where a page's inline SVGs never are, so opening
 * this view downloads the whole document and scans it. Nothing here is cached:
 * linear.app carries ~530 KB of SVG markup, and the dig cache holds 50 entries.
 */
export function SvgGridView({ pageUrl, known }: SvgGridViewProps) {
  const [state, setState] = useState<State>({ phase: "scanning" });
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  // Remembered across sessions, as the token view remembers list vs. grid.
  const [storedBackdrop, setBackdrop] = useCachedState<Backdrop>("svg-preview-backdrop", "none");
  const backdrop: Backdrop = isBackdrop(storedBackdrop) ? storedBackdrop : "none";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickLookReady, setQuickLookReady] = useState<Set<string>>(new Set());
  // Identity key: the prop is rebuilt on every parent render, so depending on the
  // array itself would restart the scan each time Resources & Assets re-renders.
  // JSON, not a joined string: a malformed URL can contain the separator.
  const knownKey = JSON.stringify(known.map((k) => k.url));

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setState({ phase: "scanning" });

    (async () => {
      try {
        const page = await fetchFullPage(pageUrl, signal);
        if (signal.aborted) return;

        // A bot challenge is a page too, and scanning it would report the
        // challenge's SVGs — usually none — as the site's. Judged on the head
        // only, as the dig does: Cloudflare injects its challenge-platform
        // script into ordinary pages' bodies, and matching that would reject a
        // page the dig had just read successfully.
        const head = headOf(page.html);
        const title = /<title[^>]*>([^<]*)<\/title>/i.exec(head)?.[1];
        const bot = detectBotProtection({ statusCode: page.status, headers: page.headers, title, html: head });
        if (bot.isChallengePage) {
          setState({ phase: "failed", message: getDeniedAccessMessage(bot.provider) });
          return;
        }

        const scan = extractSvgs(page.html, page.finalUrl, {
          maxAssets: LIMITS.MAX_SVG_ASSETS,
          known: (JSON.parse(knownKey) as string[]).map((url) => ({ url })),
        });
        const hasSprites = scan.externalSprites.length > 0;
        const hasFiles = scan.assets.some((a) => a.markup === undefined && a.url);
        setState({
          phase: "ready",
          scan,
          pageTruncated: page.truncated,
          sprites: hasSprites ? undefined : EMPTY_SPRITES,
          remote: hasFiles ? undefined : new Map(),
        });

        // Sprites and thumbnails load side by side; each lands as it finishes.
        await Promise.all([
          hasSprites &&
            loadExternalSprites(scan.externalSprites, page.finalUrl, signal).then((sprites) => {
              if (!signal.aborted) setState((prev) => (prev.phase === "ready" ? { ...prev, sprites } : prev));
            }),
          hasFiles &&
            loadRemoteSvgs(scan.assets, page.finalUrl, signal).then((remote) => {
              if (!signal.aborted) setState((prev) => (prev.phase === "ready" ? { ...prev, remote } : prev));
            }),
        ]);
      } catch (error) {
        if (signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        log.warn("svg:page-unavailable", { url: redactUrlForLog(pageUrl), error: redactUrlsInText(message) });
        setState({ phase: "failed", message });
      }
    })();

    return () => controller.abort();
  }, [pageUrl, knownKey, attempt]);

  const merged = useMemo(() => {
    if (state.phase !== "ready") return { assets: [] as SvgAsset[], truncated: false };
    const joined = mergeExternalSprites(state.scan.assets, state.sprites?.assets ?? [], LIMITS.MAX_SVG_ASSETS);
    return {
      assets: joined.assets.map((a) => withRemote(a, state.remote)),
      truncated: joined.truncated || state.scan.truncated,
    };
  }, [state]);
  const assets = merged.assets;

  // Tile images, built once per result and backdrop rather than on every render:
  // each is a data URI of up to hundreds of KB, and re-render churn is what
  // pushed Central Icons past Raycast's memory limit.
  const tiles = useMemo(() => {
    const out = new Map<string, { id: string; content: Image.ImageLike }>();
    for (const asset of assets) {
      const id = assetId(asset.key);
      if (asset.markup === undefined) {
        // Never the page's URL as a source: Raycast would fetch it outside the
        // network guard. File-backed SVGs show once loadRemoteSvgs has them.
        out.set(asset.key, { id, content: Icon.Image });
        continue;
      }
      // Display copies only: a page's SVG may reference the network itself
      // (see displaySafe). Copy and Export still hand over the original.
      const safe = displaySafe(asset.markup);
      const backed = withBackdrop(safe, backdrop);
      out.set(asset.key, {
        id,
        content: { source: backed ? svgDataUri(backed) : themedThumbnail(safe) },
      });
    }
    return out;
  }, [assets, backdrop]);

  // Quick Look for the highlighted tile only, as Central Icons does. Raycast
  // reports no selection until the user moves, so the first tile stands in.
  const selected = assets.find((a) => tiles.get(a.key)?.id === selectedId) ?? assets[0];
  useEffect(() => {
    if (!selected?.markup) return;
    const id = assetId(selected.key);
    // Keyed by path, which carries the appearance: after a light/dark switch
    // the tile needs a file drawn in the other ink.
    if (quickLookReady.has(quickLookPath(id, selected.markup))) return;
    let canceled = false;
    ensureQuickLook(id, selected.markup).then((path) => {
      if (!canceled && path) setQuickLookReady((prev) => new Set(prev).add(path));
    });
    return () => {
      canceled = true;
    };
  }, [selected, quickLookReady]);
  const available = SECTIONS.filter((s) => assets.some((a) => a.source === s.source));
  // A remembered or earlier choice whose source is gone from this result falls
  // back to All, rather than hiding everything behind a filter that no longer
  // has an entry to change it back.
  const activeFilter = available.some((s) => s.source === filter) ? filter : "all";
  const visible = activeFilter === "all" ? assets : assets.filter((a) => a.source === activeFilter);

  const isLoading =
    state.phase === "scanning" ||
    (state.phase === "ready" && (state.sprites === undefined || state.remote === undefined));

  // Everything that is known-incomplete, stated where the list is — a capped or
  // partial list presented as complete is the failure this codebase keeps making.
  const caveats: string[] = [];
  if (state.phase === "ready") {
    if (state.pageTruncated) caveats.push(`page over ${formatBytes(LIMITS.MAX_PAGE_BYTES)}, start scanned`);
    if (merged.truncated) caveats.push(`list capped at ${LIMITS.MAX_SVG_ASSETS}`);
    const s = state.sprites;
    if (s === undefined) {
      const n = state.scan.externalSprites.length;
      caveats.push(`reading ${n} sprite file${n === 1 ? "" : "s"}…`);
    } else {
      const unread = s.unchecked + s.skipped;
      if (unread > 0) caveats.push(`${unread} sprite file${unread === 1 ? "" : "s"} couldn't be read`);
      if (s.missing > 0) caveats.push(`${s.missing} referenced symbol${s.missing === 1 ? "" : "s"} missing`);
    }
  }

  // The title is the one place a filter or a search cannot hide, so an
  // incomplete scan says so there as well as in the first section.
  const navigationTitle =
    state.phase === "scanning"
      ? "SVGs — scanning page…"
      : state.phase === "failed"
        ? "SVGs"
        : `SVGs (${merged.truncated ? `first ${assets.length}` : assets.length})${caveats.length > 0 ? " — incomplete" : ""}`;

  const retry = (
    <Action
      title="Try Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={() => setAttempt((n) => n + 1)}
    />
  );

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      // No inset under a backdrop: an inset pads inside the tile, so the backdrop
      // would float as a smaller square instead of filling it (see withBackdrop).
      inset={backdrop === "none" ? Grid.Inset.Medium : undefined}
      onSelectionChange={setSelectedId}
      navigationTitle={navigationTitle}
      searchBarPlaceholder={`Filter ${assets.length} SVGs by name`}
      searchBarAccessory={
        available.length > 1 ? (
          <Grid.Dropdown tooltip="Filter by Source" storeValue onChange={setFilter}>
            <Grid.Dropdown.Item title="All Sources" value="all" />
            <Grid.Dropdown.Section title="Sources">
              {available.map((s) => (
                <Grid.Dropdown.Item key={s.source} title={s.title} value={s.source} />
              ))}
            </Grid.Dropdown.Section>
          </Grid.Dropdown>
        ) : undefined
      }
    >
      {state.phase === "ready" &&
        SECTIONS.map(({ source, title }, index) => {
          const items = visible.filter((a) => a.source === source);
          if (items.length === 0) return null;
          // Caveats ride on the first section shown, so they are read before the grid.
          const firstShown = SECTIONS.slice(0, index).every((s) => !visible.some((a) => a.source === s.source));
          const subtitle =
            firstShown && caveats.length > 0 ? `${items.length} · ${caveats.join(" · ")}` : `${items.length}`;
          return (
            <Grid.Section key={source} title={title} subtitle={subtitle}>
              {items.map((asset) => (
                <Grid.Item
                  key={asset.key}
                  id={tiles.get(asset.key)!.id}
                  content={tiles.get(asset.key)!.content}
                  title={asset.name}
                  subtitle={subtitleFor(asset, state.remote)}
                  keywords={[title, asset.url ?? ""]}
                  quickLook={
                    asset.markup !== undefined &&
                    quickLookReady.has(quickLookPath(tiles.get(asset.key)!.id, asset.markup))
                      ? { path: quickLookPath(tiles.get(asset.key)!.id, asset.markup!), name: asset.name }
                      : undefined
                  }
                  actions={
                    <SvgActions
                      asset={asset}
                      pageUrl={pageUrl}
                      backdrop={backdrop}
                      setBackdrop={setBackdrop}
                      canQuickLook={
                        asset.markup !== undefined &&
                        quickLookReady.has(quickLookPath(tiles.get(asset.key)!.id, asset.markup))
                      }
                    />
                  }
                />
              ))}
            </Grid.Section>
          );
        })}

      {state.phase === "scanning" && (
        <Grid.EmptyView
          icon={Icon.EditShape}
          title="Scanning Page for SVGs…"
          description="The dig reads only the page head, so this downloads the full page."
        />
      )}
      {state.phase === "failed" && (
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't Load the Page"
          description={state.message}
          actions={
            <ActionPanel>
              {retry}
              <Action
                title="Copy Error"
                icon={Icon.Clipboard}
                shortcut={Keyboard.Shortcut.Common.Copy}
                onAction={() => Clipboard.copy(state.message)}
              />
              <Action.OpenInBrowser url={pageUrl} shortcut={Keyboard.Shortcut.Common.Open} />
            </ActionPanel>
          }
        />
      )}
      {state.phase === "ready" && assets.length === 0 && (
        // Three different facts, and only the last is an absence. With no
        // sections on screen the caveats have nowhere else to go, so the empty
        // state carries them — otherwise an unread sprite file reads as "none".
        <Grid.EmptyView
          icon={
            state.sprites === undefined ? Icon.EditShape : caveats.length > 0 ? Icon.QuestionMarkCircle : Icon.EditShape
          }
          title={
            state.sprites === undefined
              ? "Reading Sprite Files…"
              : caveats.length > 0
                ? "Couldn't Check Every Source"
                : "No SVGs in This Page's Markup"
          }
          description={
            state.sprites === undefined
              ? "The page's icons are in separate sprite files."
              : caveats.length > 0
                ? `No SVGs found so far, but ${caveats.join("; ")}.`
                : "SVGs a script draws after the page loads aren't visible to Digger."
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={pageUrl} shortcut={Keyboard.Shortcut.Common.Open} />
              {retry}
            </ActionPanel>
          }
        />
      )}
      {state.phase === "ready" && assets.length > 0 && (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Matches"
          description={
            caveats.length > 0
              ? `No SVG matches your search. This scan is incomplete: ${caveats.join("; ")}.`
              : "No SVG matches your search."
          }
        />
      )}
    </Grid>
  );
}
