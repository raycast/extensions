import { List } from "@raycast/api";
import { DISPLAY_VALUES, LUNA_LOGO_IMG } from "../../constants";

/**
 * Defines the props for the EmptyGameList component.
 */
interface Props {
    isLoading: boolean;
    isQueryEmpty: boolean;
}

/**
 * Represents the display content for the EmptyGameList component,
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
function getDisplayContent(isLoading: boolean, isQueryEmpty: boolean): DisplayContent {
    if (isQueryEmpty) {
        return { description: DISPLAY_VALUES.defaultDescription, title: DISPLAY_VALUES.defaultTitle };
    }
    if (isLoading) {
        return { description: DISPLAY_VALUES.loadingDescription, title: DISPLAY_VALUES.loadingTitle };
    }
    return { description: DISPLAY_VALUES.emptyDescription, title: DISPLAY_VALUES.emptyTitle };
}

/**
 * The EmptyGameList component is responsible for rendering a
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
export function EmptyGameList({ isLoading, isQueryEmpty }: Props): JSX.Element {
    const content = getDisplayContent(isLoading, isQueryEmpty)
    return <List.EmptyView
        icon={{ source: LUNA_LOGO_IMG }}
        description={content.description}
        title={content.title}
    />
}