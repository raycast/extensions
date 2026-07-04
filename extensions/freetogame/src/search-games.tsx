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

type PlatformValue = "pc" | "browser";

type SortValue = "release-date" | "alphabetical";

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

type FreeToGameListResponse = FreeToGameListItem[] | { status: number; status_message: string };

export default function Command() {
  const [platform, setPlatform] = useState<PlatformValue>();
  const [categories, setCategories] = useState<CategoryValue[]>([]);
  const [sort, setSort] = useState<SortValue>();
  const [showingDetail, setShowingDetail] = useState(false);
  const {
    data: games,
    isLoading,
    error,
    revalidate,
  } = useFetch<FreeToGameListResponse>(buildGamesUrl(platform, categories), {
    keepPreviousData: true,
  });

  const sortedGames = sortGames(games, sort);

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

  const gameCount = sortedGames?.length ?? 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail}
      searchBarPlaceholder={`Search ${gameCount} free-to-play ${gameCount === 1 ? "game" : "games"}...`}
      searchBarAccessory={<PlatformDropdown platform={platform} onPlatformChange={setPlatform} />}
    >
      {sortedGames?.map((game) => (
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
              categories={categories}
              onToggleCategory={(category) =>
                setCategories((categories) =>
                  categories.includes(category)
                    ? categories.filter((selectedCategory) => selectedCategory !== category)
                    : [...categories, category],
                )
              }
              onClearCategories={() => setCategories([])}
              sort={sort}
              onSortChange={setSort}
            />
          }
        />
      ))}
      {!isLoading && sortedGames?.length === 0 ? (
        <List.EmptyView title="No games found" description="Try another filter." />
      ) : null}
    </List>
  );
}

function PlatformDropdown({
  platform,
  onPlatformChange,
}: {
  platform: PlatformValue | undefined;
  onPlatformChange: (platform: PlatformValue | undefined) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Filter Platform"
      value={platform ?? "all"}
      onChange={(value) => onPlatformChange(value === "all" ? undefined : (value as PlatformValue))}
    >
      <List.Dropdown.Item title="All Platforms" value="all" />
      <List.Dropdown.Item title="PC" value="pc" />
      <List.Dropdown.Item title="Browser" value="browser" />
    </List.Dropdown>
  );
}

function GameActions({
  game,
  showingDetail,
  onToggleDetail,
  categories,
  onToggleCategory,
  onClearCategories,
  sort,
  onSortChange,
}: {
  game: FreeToGameListItem;
  showingDetail: boolean;
  onToggleDetail: () => void;
  categories: CategoryValue[];
  onToggleCategory: (category: CategoryValue) => void;
  onClearCategories: () => void;
  sort: SortValue | undefined;
  onSortChange: (sort: SortValue | undefined) => void;
}) {
  return (
    <ActionPanel>
      <Action title={showingDetail ? "Hide Details" : "Show Details"} onAction={onToggleDetail} />
      <ActionPanel.Submenu title="Filter Categories" shortcut={Keyboard.Shortcut.Common.Copy}>
        {categories.length > 0 ? (
          <Action title="Clear Categories" onAction={onClearCategories} shortcut={Keyboard.Shortcut.Common.RemoveAll} />
        ) : null}
        {CATEGORY_VALUES.map((category) => (
          <Action
            key={category}
            title={`${categories.includes(category) ? "✓ " : ""}${CATEGORY_LABELS[category]}`}
            onAction={() => onToggleCategory(category)}
          />
        ))}
      </ActionPanel.Submenu>
      <Action.OpenInBrowser title="Open Game Website" url={game.game_url} shortcut={Keyboard.Shortcut.Common.Open} />
      <Action.OpenInBrowser
        title="Open FreeToGame Profile"
        url={game.freetogame_profile_url}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
      <ActionPanel.Section title="Sort Games">
        <Action
          title="Release Date"
          onAction={() => onSortChange("release-date")}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "r" },
            Windows: { modifiers: ["ctrl", "shift"], key: "r" },
          }}
        />
        <Action
          title="Alphabetical"
          onAction={() => onSortChange("alphabetical")}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "a" },
            Windows: { modifiers: ["ctrl", "shift"], key: "a" },
          }}
        />
        {sort ? (
          <Action
            title="Clear Sort"
            onAction={() => onSortChange(undefined)}
            shortcut={Keyboard.Shortcut.Common.Remove}
          />
        ) : null}
      </ActionPanel.Section>
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

function buildGamesUrl(platform: PlatformValue | undefined, categories: CategoryValue[]) {
  const hasCategories = categories.length > 0;
  const queryParameters: string[] = [];

  if (hasCategories) {
    queryParameters.push(`tag=${encodeURIComponent(categories.join("."))}`);
  }

  if (platform) {
    queryParameters.push(`platform=${hasCategories && platform === "pc" ? "windows" : platform}`);
  }

  const queryString = queryParameters.length > 0 ? `?${queryParameters.join("&")}` : "";

  return `${API_BASE_URL}/${hasCategories ? "filter" : "games"}${queryString}`;
}

function sortGames(games: FreeToGameListResponse | undefined, sort: SortValue | undefined) {
  if (!Array.isArray(games)) {
    return [];
  }

  if (!sort) {
    return games;
  }

  return [...games].sort((game, otherGame) => {
    if (sort === "alphabetical") {
      return game.title.localeCompare(otherGame.title);
    }

    return otherGame.release_date.localeCompare(game.release_date);
  });
}
