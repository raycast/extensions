import { Action, ActionPanel, getPreferenceValues, Grid, Icon, Keyboard, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise, useLocalStorage } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { imageUrl, museumName } from "../lib/artworks";
import { getCatalog } from "../lib/catalog";
import { indexArtworks, parseColor, searchArtworks, SUGGESTED_COLORS } from "../lib/colors";
import { ArtworkActions } from "./artwork-actions";
import { ArtworkDetail } from "./artwork-detail";

export function ArtworkGrid({ initialColor = "" }: { initialColor?: string }) {
  const [query, setQuery] = useState(initialColor);
  const [museum, setMuseum] = useState("");
  const { push, pop } = useNavigation();
  const { data, isLoading, error, mutate } = useCachedPromise(getCatalog, [], { keepPreviousData: true });
  const { value: recent = [], setValue: setRecent } = useLocalStorage<string[]>("recent-colors", []);
  const color = parseColor(query);
  const index = useMemo(() => indexArtworks(data?.artworks ?? []), [data?.artworks]);
  const resultCount = Number(getPreferenceValues<Preferences>().resultCount);
  const matches = useMemo(
    () => (color ? searchArtworks(index, color, resultCount, museum) : undefined),
    [index, color, resultCount, museum],
  );
  const museums = useMemo(
    () =>
      [
        ...new Map((data?.artworks ?? []).map((artwork) => [artwork.id.split(":")[0], museumName(artwork)])).entries(),
      ].sort((a, b) => a[1].localeCompare(b[1])),
    [data?.artworks],
  );

  useEffect(() => {
    if (!color || !matches?.results.length || recent[0] === color) return;
    const timeout = setTimeout(() => {
      void setRecent([color, ...recent.filter((entry) => entry !== color)].slice(0, 10));
    }, 700);
    return () => clearTimeout(timeout);
  }, [color, matches, recent, setRecent]);

  async function refresh() {
    try {
      await mutate(getCatalog(true));
    } catch (error) {
      await showFailureToast(error, { title: "Could not refresh catalog" });
    }
  }
  const refreshAction = (
    <Action
      title="Refresh Catalog"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={refresh}
    />
  );
  const searchFromDetail = (hex: string) => {
    setQuery(hex);
    pop();
  };
  const emptyQuery = !query.trim();

  return (
    <Grid
      navigationTitle="Museum"
      columns={4}
      fit={Grid.Fit.Contain}
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Hex, color name, rgb(), or hsl()…"
      filtering={false}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Source Museum" value={museum} onChange={setMuseum}>
          <Grid.Dropdown.Item title="All Museums" value="" />
          {museums.map(([id, title]) => (
            <Grid.Dropdown.Item key={id} value={id} title={title} />
          ))}
        </Grid.Dropdown>
      }
    >
      {emptyQuery ? (
        <>
          <Grid.Section
            title="Suggested Colors"
            subtitle={data?.stale ? "Using cached catalog · Refresh unavailable" : "Choose a color to discover art"}
          >
            {SUGGESTED_COLORS.map((hex) => (
              <Grid.Item
                key={hex}
                content={{ source: Icon.CircleFilled, tintColor: hex }}
                title={hex}
                actions={
                  <ActionPanel>
                    <Action title="Search This Color" icon={Icon.MagnifyingGlass} onAction={() => setQuery(hex)} />
                    {refreshAction}
                  </ActionPanel>
                }
              />
            ))}
          </Grid.Section>
          {recent.length > 0 && (
            <Grid.Section title="Recent Colors">
              {recent.map((hex) => (
                <Grid.Item
                  key={hex}
                  content={{ source: Icon.CircleFilled, tintColor: hex }}
                  title={hex}
                  actions={
                    <ActionPanel>
                      <Action title="Search This Color" icon={Icon.MagnifyingGlass} onAction={() => setQuery(hex)} />
                      <Action title="Clear Recent Colors" icon={Icon.Trash} onAction={() => setRecent([])} />
                      {refreshAction}
                    </ActionPanel>
                  }
                />
              ))}
            </Grid.Section>
          )}
        </>
      ) : matches?.results.length ? (
        <Grid.Section
          title={matches.closestOnly ? `Closest matches to ${color}` : `Art matching ${color}`}
          subtitle={`${matches.results.length} of ${matches.total} works${data?.stale ? " · Cached catalog, refresh unavailable" : matches.closestOnly ? " · No close color match" : ""}`}
        >
          {matches.results.map(({ artwork }) => (
            <Grid.Item
              key={artwork.id}
              content={{ source: imageUrl(artwork), fallback: Icon.Image }}
              title={artwork.title}
              subtitle={[artwork.artist || "Artist unknown", artwork.date].filter(Boolean).join(" · ")}
              actions={
                <ArtworkActions
                  artwork={artwork}
                  onSearchColor={setQuery}
                  onShowDetails={() => push(<ArtworkDetail artwork={artwork} onSearchColor={searchFromDetail} />)}
                  extraActions={refreshAction}
                />
              }
            />
          ))}
        </Grid.Section>
      ) : (
        <Grid.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.EyeDropper}
          title={
            !color
              ? "Enter a Color"
              : error
                ? "Could Not Load Artworks"
                : isLoading
                  ? "Loading Museum's Catalog…"
                  : "No Artworks in This Museum"
          }
          description={
            !color
              ? "Try #4B6C7C, teal, rgb(75, 108, 124), or hsl(200, 25%, 40%). Use an opaque color."
              : error
                ? error.message
                : "Choose another museum or refresh the catalog."
          }
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      )}
    </Grid>
  );
}
