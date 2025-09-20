import { MenuBarExtra } from "@raycast/api";
import { useTrendingGames } from "./hooks";
import { useRecents } from "./hooks/UseRecents";
import { GameSummary } from "./models";
import { openUrl } from "./utilities";
import { DISPLAY_VALUES, MENU_SECTION_CAPACITY } from "./constants";

const MENU_ICON_URL = "https://m.media-amazon.com/images/G/01/T/TC05316420/A07531864/brand/Round_Icon_128x128.png";
/**
 * The main command component that renders the menu bar extra.
 */
export default function Command() {
  const [recentGames, isRecentLoading, addGame] = useRecents(MENU_SECTION_CAPACITY);
  const [trendingGames, isTrendingLoading] = useTrendingGames();

  /**
   * If there are no trending games and the data is not still loading,
   * the component will not render anything.
   */
  if ((!trendingGames || trendingGames.length === 0) && !isTrendingLoading) {
    return null;
  }

  /**
   * A React component that renders a menu bar extra item for a given game.
   * When the item is clicked, the game is added to the recently opened list
   * and the game's URL is opened.
   */
  const MenuGameItem = ({ game }: { game: GameSummary }) => (
    <MenuBarExtra.Item
      key={game.openUrl}
      onAction={async () => {
        addGame(game);
        await openUrl(game.openUrl);
      }}
      title={game.title}
    />
  );

  return (
    <MenuBarExtra
      icon={MENU_ICON_URL}
      isLoading={isTrendingLoading || isRecentLoading || !recentGames}
      tooltip={DISPLAY_VALUES.menu_tooltip}
    >
      {recentGames?.length !== 0 ? (
        <MenuBarExtra.Section title={DISPLAY_VALUES.menu_recents_title}>
          {(recentGames ?? []).map((game) => (
            <MenuGameItem key={game.title} game={game} />
          ))}
        </MenuBarExtra.Section>
      ) : (
        <></>
      )}
      <MenuBarExtra.Section title={DISPLAY_VALUES.menu_top_title}>
        {trendingGames.slice(0, MENU_SECTION_CAPACITY).map((game) => (
          <MenuGameItem key={game.title} game={game} />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
