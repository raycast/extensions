import { useState } from "react";
import { Action, ActionPanel, Keyboard, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const API_BASE_URL = "https://www.freetogame.com/api";
const FREETOGAME_URL = "https://www.freetogame.com";

const CATEGORY_LABELS = {
  mmorpg: "MMORPG",
  shooter: "Shooter",
  strategy: "Strategy",
  moba: "MOBA",
  racing: "Racing",
  sports: "Sports",
  social: "Social",
  sandbox: "Sandbox",
  "open-world": "Open World",
  survival: "Survival",
  pvp: "PvP",
  pve: "PvE",
  pixel: "Pixel",
  voxel: "Voxel",
  zombie: "Zombie",
  "turn-based": "Turn-Based",
  "first-person": "First-Person",
  "third-Person": "Third-Person",
  "top-down": "Top-Down",
  tank: "Tank",
  space: "Space",
  sailing: "Sailing",
  "side-scroller": "Side-Scroller",
  superhero: "Superhero",
  permadeath: "Permadeath",
  card: "Card",
  "battle-royale": "Battle Royale",
  mmo: "MMO",
  mmofps: "MMOFPS",
  mmotps: "MMOTPS",
  "3d": "3D",
  "2d": "2D",
  anime: "Anime",
  fantasy: "Fantasy",
  "sci-fi": "Sci-Fi",
  fighting: "Fighting",
  "action-rpg": "Action RPG",
  action: "Action",
  military: "Military",
  "martial-arts": "Martial Arts",
  flight: "Flight",
  "low-spec": "Low-Spec",
  "tower-defense": "Tower Defense",
  horror: "Horror",
  mmorts: "MMORTS",
} as const;

const CATEGORY_VALUES = Object.keys(CATEGORY_LABELS) as CategoryValue[];

type CategoryValue = keyof typeof CATEGORY_LABELS;

type FilterValue =
  | "all"
  | "platform:pc"
  | "platform:browser"
  | `category:${CategoryValue}`
  | "sort-by:release-date"
  | "sort-by:alphabetical";

type FreeToGameListItem = {
  id: number;
  title: string;
  thumbnail: string;
  short_description: string;
  game_url: string;
  genre: string;
  platform: string;
  publisher: string;
  developer: string;
  release_date: string;
  freetogame_profile_url: string;
};

export default function Command() {
  const [filter, setFilter] = useState<FilterValue>("all");
  const [showingDetail, setShowingDetail] = useState(false);
  const {
    data: games,
    isLoading,
    error,
    revalidate,
  } = useFetch<FreeToGameListItem[]>(buildGamesUrl(filter), {
    keepPreviousData: true,
  });

  if (error) {
    return (
      <List>
        <List.EmptyView
          title="Could not load games"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={() => revalidate()} shortcut={Keyboard.Shortcut.Common.Refresh} />
              <Action.OpenInBrowser
                title="Open FreeToGame"
                url={FREETOGAME_URL}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const gameCount = games?.length ?? 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder={`Search ${gameCount} free-to-play ${gameCount === 1 ? "game" : "games"}...`}
      searchBarAccessory={<GameFilterDropdown filter={filter} onFilterChange={setFilter} />}
    >
      {games?.map((game) => (
        <List.Item
          key={game.id}
          title={game.title}
          subtitle={showingDetail ? undefined : game.short_description}
          icon={{ source: game.thumbnail }}
          accessories={showingDetail ? undefined : [{ text: game.genre }, { text: game.platform }]}
          keywords={[game.genre, game.platform, game.publisher, game.developer]}
          detail={showingDetail ? <GameListDetail game={game} /> : undefined}
          actions={
            <GameActions
              game={game}
              showingDetail={showingDetail}
              onToggleDetail={() => setShowingDetail(!showingDetail)}
            />
          }
        />
      ))}
      {!isLoading && games?.length === 0 ? (
        <List.EmptyView title="No games found" description="Try another filter." />
      ) : null}
    </List>
  );
}

function GameFilterDropdown({
  filter,
  onFilterChange,
}: {
  filter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
}) {
  return (
    <List.Dropdown tooltip="Filter Games" value={filter} onChange={(value) => onFilterChange(value as FilterValue)}>
      <List.Dropdown.Item title="All Games" value="all" />
      <List.Dropdown.Section title="Platform">
        <List.Dropdown.Item title="PC" value="platform:pc" />
        <List.Dropdown.Item title="Browser" value="platform:browser" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Category">
        {CATEGORY_VALUES.map((category) => (
          <List.Dropdown.Item key={category} title={CATEGORY_LABELS[category]} value={`category:${category}`} />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Sort">
        <List.Dropdown.Item title="Release Date" value="sort-by:release-date" />
        <List.Dropdown.Item title="Alphabetical" value="sort-by:alphabetical" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function GameActions({
  game,
  showingDetail,
  onToggleDetail,
}: {
  game: FreeToGameListItem;
  showingDetail: boolean;
  onToggleDetail: () => void;
}) {
  return (
    <ActionPanel>
      <Action title={showingDetail ? "Hide Details" : "Show Details"} onAction={onToggleDetail} />
      <Action.OpenInBrowser title="Open Game Website" url={game.game_url} shortcut={Keyboard.Shortcut.Common.Open} />
      <Action.OpenInBrowser
        title="Open FreeToGame Profile"
        url={game.freetogame_profile_url}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
    </ActionPanel>
  );
}

function GameListDetail({ game }: { game: FreeToGameListItem }) {
  return (
    <List.Item.Detail
      markdown={`# ${game.title}

![${game.title}](${game.thumbnail})

${game.short_description}

## Links

[Play Now](${game.game_url})

[FreeToGame Profile](${game.freetogame_profile_url})

---

Data source: [FreeToGame.com](${FREETOGAME_URL})
`}
      metadata={<GameListMetadata game={game} />}
    />
  );
}

function GameListMetadata({ game }: { game: FreeToGameListItem }) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Genre" text={game.genre} />
      <List.Item.Detail.Metadata.Label title="Platform" text={game.platform} />
      <List.Item.Detail.Metadata.Label title="Publisher" text={game.publisher} />
      <List.Item.Detail.Metadata.Label title="Developer" text={game.developer} />
      <List.Item.Detail.Metadata.Label title="Release Date" text={game.release_date} />
    </List.Item.Detail.Metadata>
  );
}

function buildGamesUrl(filter: FilterValue) {
  const url = new URL(`${API_BASE_URL}/games`);

  if (filter === "all") {
    return url.toString();
  }

  const [key, value] = filter.split(":");
  url.searchParams.set(key, value);

  return url.toString();
}
