import { Action, Icon } from "@raycast/api";
import { SearchCallback } from "../..";
import { DISPLAY_VALUES } from "../../constants";

/**
 * Defines the shape of the props for the SeeTrendingAction component.
 */
interface Props {
  /**
   * A callback function to execute a search for trending games.
   */
  searchCallback: SearchCallback;
}

/**
 * A React component that renders an Action with the provided props.
 * When the action is triggered, it executes the search callback with the 'isTrending' flag set to true.
 * If the action is being rendered in a detail view, it also navigates back to the previous view.
 *
 * @param props The props for the component, including a search callback and a flag indicating whether the action is being rendered in a detail view.
 * @returns A JSX.Element representing the SeeTrendingAction component.
 */
export function SeeTrendingAction({ searchCallback }: Props): JSX.Element {
  return (
    <Action
      icon={Icon.LineChart}
      onAction={() => searchCallback({ isTrending: true })}
      shortcut={{ modifiers: ["cmd"], key: "t" }}
      title={DISPLAY_VALUES.seeTrendingTitle}
    />
  );
}
