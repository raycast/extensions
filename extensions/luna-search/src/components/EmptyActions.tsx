import { Action, ActionPanel, Icon } from "@raycast/api";
import { DISPLAY_VALUES } from "../constants";
import { SearchCallback } from "..";

/**
 * Defines the props for the EmptyActions component.
 */
interface Props {
  searchCallback: SearchCallback;
}

/**
 * The EmptyActions component is responsible for rendering the actions
 * available for the empty state.
 *
 * It receives the following props:
 * - searchCallback: A mechanism to trigger the search for trending games.
 *
 * The component uses the ActionPanel and Action components from the
 * Raycast API to render the available actions.
 */
export function EmptyActions({ searchCallback }: Props): JSX.Element {
  return (
    <ActionPanel>
      <Action
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        title={DISPLAY_VALUES.seeTrendingTitle}
        icon={Icon.LineChart}
        onAction={() => searchCallback({ isTrending: true })}
      />
    </ActionPanel>
  );
}
