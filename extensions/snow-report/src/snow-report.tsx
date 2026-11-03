import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { ResortForm } from "./components/ResortForm";
import { peekForecast, useForecasts } from "./hooks/useForecasts";
import { useResorts, type ResortStore } from "./hooks/useResorts";
import { resortMarkdown } from "./lib/detail";
import { flag } from "./lib/flags";
import { isPowder, windNow, type ResortForecast } from "./lib/forecast";
import { buildIndex, searchResorts } from "./lib/search";
import { formatSnow, formatWind } from "./lib/units";
import { POPULAR_IDS } from "./lib/popular";
import type { Resort } from "./types";

type Props = LaunchProps<{ launchContext?: { resortId?: string } }>;

// Typing reselects the first result on every keystroke, so a new search only fetches once typing pauses.
// Arrowing through the list fetches straight away.
const TYPING_SETTLE_MS = 300;
// Rows fetched alongside the selected one, so arrowing on through the list usually hits the cache.
const PREFETCH_BEFORE = 4;
const PREFETCH_AFTER = 12;

export default function SnowReport({ launchContext }: Props) {
  const store = useResorts();
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState(launchContext?.resortId);

  const index = useMemo(() => buildIndex(store.resorts), [store.resorts]);
  const results = useMemo(() => searchResorts(index, searchText), [index, searchText]);

  const [settledId, setSettledId] = useState(selectedId);
  const settledSearch = useRef(searchText);
  useEffect(() => {
    if (searchText === settledSearch.current) return setSettledId(selectedId);
    const timer = setTimeout(() => {
      settledSearch.current = searchText;
      setSettledId(selectedId);
    }, TYPING_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [selectedId, searchText]);

  const customNotFavorite = useMemo(
    () => store.resorts.filter((r) => store.isCustom(r.id) && !store.isFavorite(r.id)),
    [store.resorts, store.favorites],
  );
  // An empty search shows favorites, then well-known resorts that aren't already favorites.
  const popular = useMemo(
    () =>
      POPULAR_IDS.map((id) => store.byId.get(id)).filter(
        (r): r is Resort => r !== undefined && !store.favorites.includes(r),
      ),
    [store.favorites, store.byId],
  );
  const visible = useMemo(
    () => (searchText ? results : [...store.favorites, ...popular, ...customNotFavorite]),
    [searchText, results, store.favorites, popular, customNotFavorite],
  );

  // Only favorites, the settled selection and its neighbours are ever fetched; fresh ones come from the cache.
  // With nothing selected yet, the top of the list is prefetched.
  const wanted = useMemo(() => {
    const at = Math.max(
      0,
      visible.findIndex((r) => r.id === settledId),
    );
    const nearby = visible.slice(Math.max(0, at - PREFETCH_BEFORE), at + PREFETCH_AFTER + 1);
    return [...new Set([...store.favorites, ...nearby])];
  }, [store.favorites, settledId, visible]);
  const { forecasts, isLoading, error, refresh } = useForecasts(wanted);

  const item = (resort: Resort) => (
    <ResortItem
      key={resort.id}
      resort={resort}
      forecast={peekForecast(resort) ?? forecasts[resort.id]}
      status={{ isLoading, error }}
      store={store}
      refresh={refresh}
      selected={resort.id === selectedId}
    />
  );

  return (
    <List
      isLoading={store.isLoading || isLoading}
      isShowingDetail
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search resorts by name, country or region"
      selectedItemId={launchContext?.resortId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
    >
      {searchText ? (
        <List.Section title="Results" subtitle={results.length === 50 ? "first 50" : String(results.length)}>
          {results.map(item)}
        </List.Section>
      ) : (
        <>
          <List.Section title="Favorites">{store.favorites.map(item)}</List.Section>
          <List.Section title="Popular Resorts" subtitle="Press ⌘⇧P to add a favorite">
            {popular.map(item)}
          </List.Section>
          <List.Section title="Custom Resorts">{customNotFavorite.map(item)}</List.Section>
        </>
      )}
      <List.EmptyView
        icon={Icon.Snowflake}
        title={searchText ? "No resorts found" : "No favorites yet"}
        description={
          searchText ? "Try a resort, region or country name" : "Search for a resort and press ⌘⇧P to favorite it"
        }
      />
    </List>
  );
}

const SNOWY_WEEK_CM = 10;
const snowColor = (cm: number | null) =>
  !cm ? Color.SecondaryText : cm >= SNOWY_WEEK_CM ? Color.Blue : Color.PrimaryText;

function ResortItem(props: {
  resort: Resort;
  forecast?: ResortForecast;
  status: { isLoading: boolean; error?: Error };
  store: ResortStore;
  refresh: () => void;
  selected: boolean;
}) {
  const { resort, forecast, status, store, refresh, selected } = props;
  const { push, pop } = useNavigation();
  // Rows show the summit (or the single point); the detail pane shows both.
  const headline = forecast?.kind === "split" ? forecast.summit : forecast?.point;
  const where = forecast?.kind === "split" ? "Summit" : "Forecast";
  const favorite = store.isFavorite(resort.id);
  const custom = store.isCustom(resort.id);

  const accessories: List.Item.Accessory[] = [];
  if (favorite) accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
  if (headline && windNow(headline) === "high") {
    accessories.push({
      icon: { source: Icon.Wind, tintColor: Color.Red },
      tooltip: `${where}: high wind, gusts ${formatWind(headline.windGusts)}`,
    });
  }
  // One short badge, since the list column is narrow beside the detail pane: a blue tag for fresh powder
  // (last 24h), else the next 7 days as plain text. The tooltip says which.
  if (headline) {
    accessories.push(
      isPowder(headline)
        ? {
            tag: { value: formatSnow(headline.last24h), color: Color.Blue },
            tooltip: `${where}: fresh powder, ${formatSnow(headline.last24h)} in the last 24h`,
          }
        : {
            text: {
              value: formatSnow(headline.next7d),
              color: headline.next7d ? Color.PrimaryText : Color.SecondaryText,
            },
            tooltip: `${where}: ${formatSnow(headline.next7d)} over the next 7 days`,
          },
    );
  }
  // Snowflake brightens with the week's snowfall; a grey mountain until the forecast loads.
  const icon = !headline
    ? { source: Icon.Mountain, tintColor: Color.SecondaryText }
    : { source: Icon.Snowflake, tintColor: snowColor(headline.next7d) };

  return (
    <List.Item
      id={resort.id}
      icon={icon}
      title={resort.name}
      // Just the flag, so the name has room; the country is in the tooltip and the detail pane.
      subtitle={{ value: flag(resort.country) || resort.country, tooltip: resort.country }}
      accessories={accessories}
      // Raycast sends every row's detail on each render but only shows the selected one, so only that
      // row carries the full graphic; the others get a one-line placeholder.
      detail={<List.Item.Detail markdown={selected ? resortMarkdown(resort, forecast, status) : `## ${resort.name}`} />}
      actions={
        <ActionPanel>
          <Action
            title={favorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={favorite ? Icon.StarDisabled : Icon.Star}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => store.toggleFavorite(resort.id)}
          />
          {resort.website && <Action.OpenInBrowser title="Open Resort Website" url={resort.website} />}
          {/* No webcam source covers every resort without an API key, so search for them. */}
          <Action.OpenInBrowser
            title="Find Webcams"
            icon={Icon.Video}
            url={`https://www.google.com/search?q=${encodeURIComponent(`${resort.name} live webcam`)}`}
          />
          <Action
            title="Refresh Forecast"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
          {favorite && store.favorites[0]?.id !== resort.id && (
            <Action
              title="Show in Menu Bar"
              icon={Icon.ArrowUp}
              onAction={() => store.makePrimaryFavorite(resort.id)}
            />
          )}
          <ActionPanel.Section>
            <Action
              title={custom ? "Edit Resort" : "Edit Elevations"}
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() =>
                push(
                  custom ? (
                    <ResortForm mode="custom" resort={resort} onSave={store.saveCustom} afterSave={pop} />
                  ) : (
                    <ResortForm
                      mode="override"
                      resort={resort}
                      onSave={(e) => store.setOverride(resort.id, e)}
                      afterSave={pop}
                    />
                  ),
                )
              }
            />
            {store.hasOverride(resort.id) && (
              <Action
                title="Reset Elevations to OpenSkiData"
                icon={Icon.Undo}
                onAction={() => store.clearOverride(resort.id)}
              />
            )}
            {custom && (
              <Action
                title="Delete Resort"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={async () => {
                  const ok = await confirmAlert({
                    title: `Delete ${resort.name}?`,
                    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                  });
                  if (ok) await store.deleteCustom(resort.id);
                }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
