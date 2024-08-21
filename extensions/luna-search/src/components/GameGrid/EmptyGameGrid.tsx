import { Grid } from "@raycast/api";
import { DISPLAY_VALUES, LUNA_LOGO_IMG } from "../../constants";
import { GameSummary, LunaService } from "../../services";
import { useEffect, useState } from "react";
import { EmptyActions } from "../Actions";
import { SearchCallback } from "../..";

const LUNA = LunaService.getInstance();

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
export function getDisplayContent(isLoading: boolean, isQueryEmpty: boolean): DisplayContent {
  if (isQueryEmpty) {
    return { description: DISPLAY_VALUES.defaultDescription, title: DISPLAY_VALUES.defaultTitle };
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
  isQueryEmpty: boolean;
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
export function EmptyGameGrid({ isLoading, isQueryEmpty, searchCallback }: Props): JSX.Element {
  const [trending, setTrending] = useState<GameSummary[]>([]);

  useEffect(() => {
    const loadTrending = async () => {
      const trending = await LUNA.getTrendingGames();
      setTrending(trending);
    };
    loadTrending();
  }, []);

  const content = getDisplayContent(!!isLoading, isQueryEmpty);
  return (
    <Grid.EmptyView
      actions={<EmptyActions searchCallback={searchCallback} />}
      icon={{ source: LUNA_LOGO_IMG }}
      description={
        trending.length == 0
          ? content.description
          : `${DISPLAY_VALUES.trendingPrefix}${trending.map((game) => game.title).join(", ")}`
      }
      title={content.title}
    />
  );
}
