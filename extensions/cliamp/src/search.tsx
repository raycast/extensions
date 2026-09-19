import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  addFavorite,
  favoriteFromTrack,
  FavStation,
  readFavorites,
  removeFavorite,
  stationDeeplink,
  trackFromFavorite,
} from "./lib/favorites";
import { addTrackFavorite, listTrackFavorites, removeTrackFavorite } from "./lib/trackFavorites";
import { callOp, listProviders, ProviderPlaylist, Track, trackLabel } from "./lib/ipc";

const BITRATES = [0, 64, 128, 192, 256, 320];
const CODECS = ["", "MP3", "AAC", "OGG", "FLAC"];

function fail(e: unknown) {
  return showToast({
    style: Toast.Style.Failure,
    title: "cliamp error",
    message: String(e instanceof Error ? e.message : e),
  });
}

function trackBitrate(t: Track): number | undefined {
  const n = parseInt(String(t.provider_meta?.["radio.bitrate"] ?? ""), 10);
  return Number.isFinite(n) ? n : undefined;
}

function nameBitrate(name: string): number | undefined {
  const m = name.match(/\[(\d+)k\]/);
  return m ? parseInt(m[1], 10) : undefined;
}

export default function SearchMusic() {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<string>("");
  const [minBitrate, setMinBitrate] = useCachedState<number>("min-bitrate", 0);
  const [codec, setCodec] = useCachedState<string>("codec-filter", "");
  const [favorites, setFavorites] = useState<FavStation[]>(() => readFavorites());

  const providers = usePromise(listProviders);
  const trackFavs = usePromise(listTrackFavorites);
  const hasCatalog = providers.data?.find((p) => p.key === provider)?.catalog ?? false;
  const isRadio = provider === "radio";

  const results = usePromise(
    async (prov: string, q: string): Promise<Track[]> => {
      if (!prov || !q.trim()) return [];
      const res = await callOp<{ tracks?: Track[] }>("provider.search", {
        provider: prov,
        query: q.trim(),
        offset: 0,
        limit: 50,
      });
      return res.tracks ?? [];
    },
    [provider, query],
  );

  // With an empty search box, show the provider's browsable catalog (e.g. radio stations).
  const catalog = usePromise(
    async (prov: string, q: string, capable: boolean): Promise<ProviderPlaylist[]> => {
      if (!prov || q.trim() || !capable) return [];
      const res = await callOp<{ playlists?: ProviderPlaylist[] }>("provider.catalog", {
        provider: prov,
        offset: 0,
        limit: 200,
      });
      return res.playlists ?? [];
    },
    [provider, query, hasCatalog],
  );

  const passes = (bitrate?: number, cod?: string): boolean => {
    if (minBitrate > 0 && (bitrate === undefined || bitrate < minBitrate)) return false;
    if (codec && (!cod || !cod.toUpperCase().includes(codec))) return false;
    return true;
  };

  const filterSuffix = (minBitrate > 0 ? ` · ≥${minBitrate} kbps` : "") + (codec ? ` · ${codec}` : "");

  const favoriteUrls = new Set(favorites.map((f) => f.url));

  async function act(operation: string, track: Track, title: string) {
    try {
      await callOp(operation, { track });
      await showToast({ style: Toast.Style.Success, title, message: trackLabel(track) });
    } catch (e) {
      await fail(e);
    }
  }

  async function listen(pl: ProviderPlaylist) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Tuning in…", message: pl.name });
      await callOp("provider.load", { provider, playlist: pl.id });
      await callOp("play");
      await showToast({ style: Toast.Style.Success, title: "Playing", message: pl.name });
    } catch (e) {
      await fail(e);
    }
  }

  const favoriteTrackPaths = new Set((trackFavs.data ?? []).map((t) => String(t.path)));

  async function toggleTrackFavorite(t: Track) {
    try {
      const index = (trackFavs.data ?? []).findIndex((f) => f.path === t.path);
      if (index >= 0) {
        await removeTrackFavorite(index);
        await showToast({ style: Toast.Style.Success, title: "Removed from Favorites", message: t.title });
      } else {
        await addTrackFavorite(t);
        await showToast({ style: Toast.Style.Success, title: "Added to Favorites", message: t.title });
      }
      trackFavs.revalidate();
    } catch (e) {
      await fail(e);
    }
  }

  function toggleFavorite(t: Track) {
    const url = String(t.path ?? "");
    if (favoriteUrls.has(url)) {
      setFavorites(removeFavorite(url));
      showToast({ style: Toast.Style.Success, title: "Removed from Favorites", message: t.title });
    } else {
      const fav = favoriteFromTrack(t);
      if (!fav) return;
      setFavorites(addFavorite(fav));
      showToast({ style: Toast.Style.Success, title: "Added to Favorites", message: t.title });
    }
  }

  const filterActions = (
    <ActionPanel.Section title="Filter">
      <ActionPanel.Submenu
        title={`Min Bitrate${minBitrate ? `: ${minBitrate} Kbps` : ""}`}
        icon={Icon.Signal3}
        shortcut={{ modifiers: ["cmd"], key: "f" }}
      >
        {BITRATES.map((b) => (
          <Action
            key={b}
            title={b === 0 ? `Any${minBitrate === 0 ? "  ✓" : ""}` : `≥ ${b} kbps${minBitrate === b ? "  ✓" : ""}`}
            onAction={() => setMinBitrate(b)}
          />
        ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu
        title={`Codec${codec ? `: ${codec}` : ""}`}
        icon={Icon.Waveform}
        shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      >
        {CODECS.map((c) => (
          <Action key={c || "any"} title={`${c || "Any"}${codec === c ? "  ✓" : ""}`} onAction={() => setCodec(c)} />
        ))}
      </ActionPanel.Submenu>
      {(minBitrate > 0 || codec) && (
        <Action
          title="Clear Filters"
          icon={Icon.XMarkCircle}
          onAction={() => {
            setMinBitrate(0);
            setCodec("");
          }}
        />
      )}
    </ActionPanel.Section>
  );

  const shownFavorites = isRadio && !query.trim() ? favorites.filter((f) => passes(f.bitrate, f.codec)) : [];
  const shownResults = (results.data ?? []).filter((t) =>
    passes(trackBitrate(t), String(t.provider_meta?.["radio.codec"] ?? "") || undefined),
  );
  // Catalog names carry "[320k]" but no codec, so only the bitrate filter applies here.
  // cliamp lists a favorited station twice (as an "f:" favorite row and a "c:" catalog
  // row with the same name), so keep only the first occurrence of each name.
  const seenCatalogNames = new Set<string>();
  const shownCatalog = (catalog.data ?? []).filter((pl) => {
    const name = pl.name.replace(/^★\s*/, "");
    if (seenCatalogNames.has(name)) return false;
    seenCatalogNames.add(name);
    if (!pl.id.startsWith("c:") || minBitrate === 0) return true;
    const b = nameBitrate(pl.name);
    return b !== undefined && b >= minBitrate;
  });

  return (
    <List
      isLoading={providers.isLoading || results.isLoading || catalog.isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search music, radio, podcasts…"
      searchBarAccessory={
        <List.Dropdown tooltip="Provider" storeValue onChange={setProvider}>
          {(providers.data ?? [])
            .filter((p) => p.searchable !== false)
            .map((p) => (
              <List.Dropdown.Item key={p.key} title={p.name} value={p.key} />
            ))}
        </List.Dropdown>
      }
      actions={<ActionPanel>{filterActions}</ActionPanel>}
    >
      {shownFavorites.length > 0 && (
        <List.Section title={`Favorites${filterSuffix}`}>
          {shownFavorites.map((f) => (
            <List.Item
              key={`fav-${f.url}`}
              icon={Icon.Star}
              title={f.name}
              subtitle={f.tags ? f.tags.split(",").slice(0, 3).join(", ") : undefined}
              accessories={[
                ...(f.codec ? [{ tag: f.codec }] : []),
                ...(f.bitrate ? [{ text: `${f.bitrate} kbps` }] : []),
                ...(f.country ? [{ text: f.country }] : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Play Now"
                    icon={Icon.Play}
                    onAction={() => act("track.play", trackFromFavorite(f), "Playing")}
                  />
                  <Action
                    title="Queue Next"
                    icon={Icon.Forward}
                    onAction={() => act("track.queue", trackFromFavorite(f), "Queued next")}
                  />
                  <Action.CreateQuicklink
                    title="Create Quicklink"
                    icon={Icon.Link}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                    quicklink={{ name: `Play ${f.name}`, link: stationDeeplink(f.name, f.url) }}
                  />
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.StarDisabled}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => {
                      setFavorites(removeFavorite(f.url));
                      showToast({ style: Toast.Style.Success, title: "Removed from Favorites", message: f.name });
                    }}
                  />
                  {filterActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {!query.trim() && (trackFavs.data?.length ?? 0) > 0 && (
        <List.Section title="Favorite Tracks">
          {(trackFavs.data ?? []).map((t, i) => (
            <List.Item
              key={`tfav-${t.path ?? i}`}
              icon={Icon.Star}
              title={t.title ?? trackLabel(t)}
              subtitle={t.artist}
              accessories={t.album ? [{ text: t.album }] : []}
              actions={
                <ActionPanel>
                  <Action title="Play Now" icon={Icon.Play} onAction={() => act("track.play", t, "Playing")} />
                  <Action
                    title="Queue Next"
                    icon={Icon.Forward}
                    onAction={() => act("track.queue", t, "Queued next")}
                  />
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.StarDisabled}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={async () => {
                      try {
                        await removeTrackFavorite(i);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Removed from Favorites",
                          message: t.title,
                        });
                        trackFavs.revalidate();
                      } catch (e) {
                        await fail(e);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {!query.trim() && shownCatalog.length > 0 && (
        <List.Section title={`Browse${filterSuffix}`}>
          {shownCatalog.map((pl) => {
            const [name, ...rest] = pl.name.split(" · ");
            return (
              <List.Item
                key={pl.id}
                icon={pl.id.startsWith("loc:") ? Icon.Pin : pl.id.startsWith("l:") ? Icon.List : Icon.Livestream}
                title={name}
                accessories={rest.length ? [{ text: rest.join(" · ") }] : []}
                actions={
                  <ActionPanel>
                    <Action title="Listen" icon={Icon.Play} onAction={() => listen(pl)} />
                    {pl.favoritable === true && (
                      <Action
                        title="Toggle Cliamp Favorite"
                        icon={Icon.Star}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={async () => {
                          try {
                            await callOp("provider.favorite", { provider, playlist: pl.id });
                            await showToast({
                              style: Toast.Style.Success,
                              title: "Favorite toggled",
                              message: pl.name,
                            });
                            catalog.revalidate();
                          } catch (e) {
                            await fail(e);
                          }
                        }}
                      />
                    )}
                    {filterActions}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {shownResults.length > 0 && (
        <List.Section title={`Results${filterSuffix}`}>
          {shownResults.map((t, i) => {
            const meta = t.provider_meta ?? {};
            const isFav = !!t.path && favoriteUrls.has(String(t.path));
            const isTrackFav = !!t.path && favoriteTrackPaths.has(String(t.path));
            const accessories: List.Item.Accessory[] = [];
            if (isFav || isTrackFav) accessories.push({ icon: Icon.Star });
            if (meta["radio.codec"]) accessories.push({ tag: meta["radio.codec"] });
            if (meta["radio.bitrate"]) accessories.push({ text: `${meta["radio.bitrate"]} kbps` });
            if (meta["radio.country"]) accessories.push({ text: meta["radio.country"] });
            return (
              <List.Item
                key={`${t.path ?? t.title ?? "t"}-${i}`}
                icon={t.stream ? Icon.Livestream : Icon.Music}
                title={t.title ?? trackLabel(t)}
                subtitle={t.artist ?? (t.genre ? String(t.genre).split(",").slice(0, 3).join(", ") : undefined)}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <Action title="Play Now" icon={Icon.Play} onAction={() => act("track.play", t, "Playing")} />
                      <Action
                        title="Queue Next"
                        icon={Icon.Forward}
                        onAction={() => act("track.queue", t, "Queued next")}
                      />
                      {isRadio && t.stream && t.path && t.title && (
                        <Action.CreateQuicklink
                          title="Create Quicklink"
                          icon={Icon.Link}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                          quicklink={{ name: `Play ${t.title}`, link: stationDeeplink(t.title, String(t.path)) }}
                        />
                      )}
                      {isRadio && t.stream && (
                        <Action
                          title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                          icon={isFav ? Icon.StarDisabled : Icon.Star}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() => toggleFavorite(t)}
                        />
                      )}
                      {!isRadio && t.path && t.title && (
                        <Action
                          title={isTrackFav ? "Remove from Favorites" : "Add to Favorites"}
                          icon={isTrackFav ? Icon.StarDisabled : Icon.Star}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() => toggleTrackFavorite(t)}
                        />
                      )}
                      {t.path && <Action.CopyToClipboard title="Copy URL/Path" content={String(t.path)} />}
                    </ActionPanel.Section>
                    {filterActions}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={
          query.trim()
            ? results.isLoading
              ? "Searching…"
              : minBitrate > 0 || codec
                ? `No results${filterSuffix}`
                : "No results"
            : "Search cliamp"
        }
        description={query.trim() ? undefined : "Pick a provider in the dropdown and start typing."}
      />
    </List>
  );
}
