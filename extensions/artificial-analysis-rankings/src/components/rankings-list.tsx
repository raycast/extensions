import { Color, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useCachedFlag } from "../hooks/use-cached-flag";
import {
  updatedText,
  useBrowseControls,
  useNow,
  useRankingsData,
  type BrowseControls,
  type RankingsData,
} from "../hooks/use-rankings";
import { configurationLabel, familyName } from "../lib/families";
import { browseEntries } from "../lib/filters";
import { providerIcon } from "../lib/images";
import { isPriceMetric, METRIC_GROUPS, METRICS, type MetricKey } from "../lib/metrics";
import { rankModels } from "../lib/models";
import { buildStandings } from "../lib/standings";
import { metricIcon } from "./leaderboards";
import { unavailableState, type EmptyState } from "./load-states";
import { ModelActions } from "./model-actions";
import { ModelDetailPanel } from "./model-details";
import { Setup } from "./setup";

const PRICE_METRICS: MetricKey[] = ["inputPrice", "outputPrice"];

export function RankingsList({
  initialMetric = "intelligence",
  pricing = false,
  initialFavoritesOnly = false,
  initialProviderId,
}: {
  initialMetric?: MetricKey;
  pricing?: boolean;
  initialFavoritesOnly?: boolean;
  initialProviderId?: string;
}) {
  const data = useRankingsData();
  const now = useNow();
  const [search, setSearch] = useState("");
  const [metric, setMetric] = useState(initialMetric);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showingPanel, setShowingPanel] = useCachedFlag("show-details-panel", false);
  const controls = useBrowseControls(data.snapshot, {
    providerId: initialProviderId,
    favoritesOnly: initialFavoritesOnly,
  });
  const ranked = useMemo(() => rankModels(data.snapshot?.models ?? [], metric), [data.snapshot, metric]);
  const standings = useMemo(() => buildStandings(data.snapshot?.models ?? []), [data.snapshot]);
  const rows = useMemo(
    () =>
      browseEntries(
        ranked,
        search,
        { providerId: controls.providerId, favoritesOnly: controls.favoritesOnly },
        data.favorites.ids,
      ).map((model) => ({ model, family: familyName(model.name), configuration: configurationLabel(model.name) })),
    [ranked, search, controls.providerId, controls.favoritesOnly, data.favorites.ids],
  );
  if (data.needsApiKey) return <Setup />;
  const definition = METRICS[metric];
  const selected = rows.find(({ model }) => model.id === selectedId)?.model ?? rows[0]?.model;
  const empty = emptyState(data, controls, search, definition.title);
  return (
    <List
      onSelectionChange={setSelectedId}
      navigationTitle={controls.favoritesOnly ? "Favorite Models" : definition.commandTitle}
      searchBarPlaceholder="Search models or providers…"
      filtering={false}
      searchText={search}
      onSearchTextChange={setSearch}
      isLoading={data.isLoading}
      isShowingDetail={showingPanel && rows.length > 0}
      searchBarAccessory={
        <List.Dropdown tooltip="Rank By" value={metric} onChange={(value) => setMetric(value as MetricKey)}>
          {pricing
            ? PRICE_METRICS.map((key) => (
                <List.Dropdown.Item key={key} title={METRICS[key].title} value={key} icon={metricIcon(key)} />
              ))
            : METRIC_GROUPS.map((group) => (
                <List.Dropdown.Section key={group.title} title={group.title}>
                  {group.metrics.map((key) => (
                    <List.Dropdown.Item key={key} title={METRICS[key].title} value={key} icon={metricIcon(key)} />
                  ))}
                </List.Dropdown.Section>
              ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView title={empty.title} description={empty.description} icon={empty.icon} actions={empty.actions} />
      {data.snapshot ? (
        <List.Section
          title={sectionTitle(controls, metric)}
          subtitle={`${countText(rows.length, ranked.length)} · ${updatedText(data, now)}`}
        >
          {rows.map(({ model, family, configuration }) => {
            const isSelected = model.id === selected?.id;
            const favorite = data.favorites.ids.has(model.id);
            const accessories: List.Item.Accessory[] = [];
            if (favorite)
              accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
            if (data.comparison.ids.has(model.id))
              accessories.push({ icon: { source: Icon.BarChart, tintColor: Color.Blue }, tooltip: "In comparison" });
            if (!showingPanel) {
              accessories.push({
                text: { value: definition.format(model.value), color: Color.PrimaryText },
                tooltip: `${definition.title} · ${definition.unit}`,
              });
            }
            return (
              <List.Item
                key={model.id}
                id={model.id}
                icon={{ value: providerIcon(model.creator), tooltip: model.creator }}
                title={{ value: `${model.rank}. ${family}`, tooltip: model.name }}
                subtitle={configuration}
                accessories={accessories}
                detail={
                  showingPanel && isSelected ? (
                    <ModelDetailPanel model={model} standings={standings} preferences={data.preferences} />
                  ) : undefined
                }
                actions={
                  isSelected ? (
                    <ModelActions
                      data={data}
                      model={model}
                      controls={controls}
                      panel={{ visible: showingPanel, toggle: () => setShowingPanel(!showingPanel) }}
                    />
                  ) : undefined
                }
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}

function sectionTitle(controls: BrowseControls, metric: MetricKey): string {
  const provider = controls.creators.find((creator) => creator.id === controls.providerId);
  const metricTitle = `${METRICS[metric].title}${isPriceMetric(metric) ? " per 1M Tokens" : ""}`;
  return [controls.favoritesOnly ? "Favorites" : undefined, metricTitle, provider?.name].filter(Boolean).join(" · ");
}

function countText(shown: number, total: number): string {
  const noun = total === 1 ? "model" : "models";
  return shown === total ? `${total} ${noun}` : `${shown} of ${total} ${noun}`;
}

function emptyState(data: RankingsData, controls: BrowseControls, search: string, metricTitle: string): EmptyState {
  if (!data.snapshot) return unavailableState(data);
  const actions = <ModelActions data={data} controls={controls} />;
  if (controls.favoritesOnly && data.favorites.ids.size === 0) {
    return {
      title: "No Favorites Yet",
      description: "Choose Show All Models, then press ⌘. on a model to add it here.",
      icon: Icon.Star,
      actions,
    };
  }
  if (search.trim()) {
    return {
      title: "No Matching Models",
      description: "Try another model or provider name, or clear your filters.",
      icon: Icon.MagnifyingGlass,
      actions,
    };
  }
  return {
    title: "No Models to Show",
    description: `No models in this view have a published ${metricTitle} measurement.`,
    icon: Icon.MagnifyingGlass,
    actions,
  };
}
