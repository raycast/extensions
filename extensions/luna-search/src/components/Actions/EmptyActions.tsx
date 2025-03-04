import { ActionPanel } from "@raycast/api";
import { SearchCallback } from "../..";
import { SeeTrendingAction } from "./SeeTrendingAction";

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
 * The component uses the ActionPanel and SeeTrendingAction components  to render
 * the available actions.
 */
export function EmptyActions({ searchCallback }: Props): JSX.Element {
  return (
    <ActionPanel>
      <SeeTrendingAction searchCallback={searchCallback} />
    </ActionPanel>
  );
}
