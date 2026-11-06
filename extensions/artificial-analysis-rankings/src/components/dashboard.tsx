import { Action, ActionPanel, Color, environment, Grid, Icon } from "@raycast/api";
import { useMemo, useState, type JSX } from "react";
import { MAX_COMPARED_MODELS } from "../hooks/use-comparison";
import { updatedText, useBrowseControls, useNow, useRankingsData } from "../hooks/use-rankings";
import { browseCardSvg, leaderboardTileSvg, modelCardSvg, type TileIcon } from "../lib/cards";
import { distinctModelRankings } from "../lib/families";
import { ALL_PROVIDERS, browseEntries } from "../lib/filters";
import { logoSvg, providerIcon, svgImage } from "../lib/images";
import { METRICS } from "../lib/metrics";
import { rankModels } from "../lib/models";
import { CompareModels } from "./compare-models";
import { LeaderboardList, LEADERBOARDS } from "./leaderboards";
import { unavailableState, type EmptyState } from "./load-states";
import { GeneralActions, ModelActions } from "./model-actions";
import { RankingsList } from "./rankings-list";
import { Setup } from "./setup";

interface Tile {
  id: string;
  icon: TileIcon;
  label: string;
  detail: string;
  tooltip: string;
  title: string;
  target: JSX.Element;
}

export function Dashboard() {
  const data = useRankingsData();
  const now = useNow();
  const [search, setSearch] = useState("");
  const controls = useBrowseControls(data.snapshot);
  const { providerId } = controls;
  const provider = controls.creators.find((creator) => creator.id === providerId);
  // Rank across every provider first, so filtered cards keep their global ranks.
  const families = useMemo(() => distinctModelRankings(data.snapshot?.models ?? []), [data.snapshot]);
  const top = useMemo(
    () => browseEntries(families, search, { providerId, favoritesOnly: false }, data.favorites.ids).slice(0, 5),
    [families, search, providerId, data.favorites.ids],
  );
  const models = useMemo(
    () =>
      (data.snapshot?.models ?? []).filter((model) => providerId === ALL_PROVIDERS || model.creatorId === providerId),
    [data.snapshot, providerId],
  );
  const cards = useMemo(
    () =>
      top.map((model) => ({
        model,
        image: svgImage(
          modelCardSvg(model, environment.appearance, logoSvg(model.creator), {
            value: METRICS.intelligence.format(model.value),
            label: METRICS.intelligence.title,
          }),
        ),
      })),
    [top],
  );
  const comparing = data.comparison.ids.size;
  const tiles = useMemo((): Tile[] => {
    const leaderboards = LEADERBOARDS.map((board): Tile => {
      const base = {
        id: `leaderboard-${board.tile}`,
        icon: board.tile,
        label: board.caption,
        title: board.title,
        target: <LeaderboardList board={board} providerId={provider?.id} />,
      };
      if (board.favoritesOnly) {
        const saved = models.filter((model) => data.favorites.ids.has(model.id)).length;
        return { ...base, detail: saved ? `${saved} saved` : "None yet", tooltip: board.title };
      }
      const leader = rankModels(models, board.metric)[0];
      const value = leader ? METRICS[board.metric].format(leader.value) : undefined;
      return {
        ...base,
        detail: value ? `Best ${value}` : "No data yet",
        tooltip: leader ? `${board.title}\nLeader: ${leader.name} (${value})` : board.title,
      };
    });
    return [
      ...leaderboards,
      {
        id: "compare-models",
        icon: "compare",
        label: "Compare",
        detail: comparing ? `${comparing} selected` : `Pick up to ${MAX_COMPARED_MODELS}`,
        tooltip: "Compare models side by side",
        title: "Compare Models",
        target: <CompareModels />,
      },
    ];
  }, [models, data.favorites.ids, comparing, provider?.id]);
  if (data.needsApiKey) return <Setup />;
  const searching = search.trim().length > 0;
  const emptyState: EmptyState = data.snapshot
    ? {
        title: "No Matching Models",
        description: "Try another model or provider name.",
        icon: Icon.MagnifyingGlass,
        actions: <ModelActions data={data} />,
      }
    : unavailableState(data);
  return (
    <Grid
      columns={3}
      aspectRatio="16/9"
      inset={Grid.Inset.Zero}
      navigationTitle="AI Model Rankings"
      searchBarPlaceholder="Search top models or providers…"
      filtering={false}
      searchText={search}
      onSearchTextChange={setSearch}
      isLoading={data.isLoading}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter by Provider" value={providerId} onChange={controls.setProviderId}>
          <Grid.Dropdown.Item title="All Providers" value={ALL_PROVIDERS} icon={Icon.Globe} />
          <Grid.Dropdown.Section title="Providers">
            {controls.creators.map((creator) => (
              <Grid.Dropdown.Item
                key={creator.id}
                title={creator.name}
                value={creator.id}
                icon={providerIcon(creator.name)}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView
        title={emptyState.title}
        description={emptyState.description}
        icon={emptyState.icon}
        actions={emptyState.actions}
      />
      {data.snapshot && cards.length ? (
        <Grid.Section
          title={provider ? `Top ${provider.name} Models` : "Top Models"}
          subtitle={`${METRICS.intelligence.title} · ${updatedText(data, now)}`}
        >
          {cards.map(({ model, image }) => (
            <Grid.Item
              key={model.id}
              id={model.id}
              content={{
                value: image,
                tooltip: `#${model.rank} ${model.name}\n${model.creator} · ${METRICS.intelligence.title} ${model.value}`,
              }}
              title={model.creator}
              accessory={
                data.favorites.ids.has(model.id)
                  ? { icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" }
                  : undefined
              }
              actions={<ModelActions data={data} model={model} />}
            />
          ))}
          <Grid.Item
            id="browse-all"
            content={svgImage(browseCardSvg(models.length, environment.appearance))}
            title={provider ? `All ${provider.name} Models` : "All Evaluated Models"}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Browse All Models"
                  icon={Icon.List}
                  target={<RankingsList initialProviderId={provider?.id} />}
                />
                <GeneralActions data={data} />
              </ActionPanel>
            }
          />
        </Grid.Section>
      ) : null}
      {data.snapshot && !searching ? (
        <Grid.Section title="More Leaderboards" columns={8} aspectRatio="1">
          {tiles.map((tile) => (
            <Grid.Item
              key={tile.id}
              id={tile.id}
              content={{
                value: svgImage(leaderboardTileSvg(tile.icon, environment.appearance)),
                tooltip: tile.tooltip,
              }}
              title={tile.label}
              subtitle={tile.detail}
              actions={
                <ActionPanel title={tile.title}>
                  <Action.Push title={`Open ${tile.title}`} icon={Icon.List} target={tile.target} />
                  <GeneralActions data={data} />
                </ActionPanel>
              }
            />
          ))}
        </Grid.Section>
      ) : null}
    </Grid>
  );
}
