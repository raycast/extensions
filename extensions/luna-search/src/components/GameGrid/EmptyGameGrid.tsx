import { Grid } from "@raycast/api";
import { DISPLAY_VALUES, LUNA_LOGO_IMG, MIN_SEARCH_LENGTH } from "../../constants";
import { EmptyActions } from "../Actions";
import { SearchCallback } from "../..";
import { useTrendingGames } from "../../hooks";

/**
 * Represents the display content for the EmptyGameGrid component,
 * including the title and description.
 */
interface DisplayContent {
  description: string;
  title: string;
}

/**
 * Determines the appropriate display content based on the loading
 * and query state.
 *
 * @param isLoading Whether the game data is currently being loaded.
 * @param isQueryEmpty Whether the search query is empty.
 * @returns The DisplayContent object with the appropriate title and description.
 */
export function getDisplayContent(isLoading: boolean, query?: string): DisplayContent {
  if (!query || query.length === 0) {
    return { description: DISPLAY_VALUES.defaultDescription, title: DISPLAY_VALUES.defaultTitle };
  }
  if (query.length < MIN_SEARCH_LENGTH) {
    return { description: DISPLAY_VALUES.tooFewCharsSearchDescription, title: DISPLAY_VALUES.tooFewCharsSearchTitle };
  }
  if (isLoading) {
    return { description: DISPLAY_VALUES.loadingDescription, title: DISPLAY_VALUES.loadingTitle };
  }
  return { description: DISPLAY_VALUES.emptyDescription, title: DISPLAY_VALUES.emptyTitle };
}

/**
 * Defines the props for the EmptyGameGrid component.
 */
interface Props {
  isLoading?: boolean;
  query?: string;
  searchCallback: SearchCallback;
}

/**
 * The EmptyGameGrid component is responsible for rendering a
 * placeholder view when there are no games to display.
 *
 * It receives the following props:
 * - isLoading: A boolean indicating whether the game data is currently being loaded.
 * - isQueryEmpty: A boolean indicating whether the search query is empty.
 *
 * The component uses the getDisplayContent function to determine the
 * appropriate title and description to display based on the loading
 * and query state. It then renders a List.EmptyView component from
 * the Raycast API, using the Luna logo as the icon.
 */
export function EmptyGameGrid({ isLoading, query, searchCallback }: Props): JSX.Element {
  const [games] = useTrendingGames();

  const content = getDisplayContent(!!isLoading, query);
  return (
    <Grid.EmptyView
      actions={<EmptyActions searchCallback={searchCallback} />}
      icon={{ source: LUNA_LOGO_IMG }}
      description={
        games.length == 0
          ? content.description
          : `${DISPLAY_VALUES.trendingPrefix}${games.map((game) => game.title).join(", ")}`
      }
      title={content.title}
    />
  );
}
