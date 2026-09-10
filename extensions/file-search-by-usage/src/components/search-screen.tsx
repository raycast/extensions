import { List } from "@raycast/api";
import { useLayoutEffect, useSyncExternalStore } from "react";

/** Holds only the active list; publishing does not rerender the search owner. */
export class SearchScreen {
  private frameId = 0;
  private props: List.Props = {
    filtering: false,
    isLoading: true,
    searchText: "",
  };
  private listeners = new Set<() => void>();

  getSnapshot = (): List.Props => this.props;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  onSearchTextChange = (text: string): void => {
    const onChange = this.props.onSearchTextChange;
    // Raycast must receive the new text in the same commit as its input counter.
    if (text !== this.props.searchText)
      this.publish(this.frameId, { ...this.props, searchText: text });
    onChange?.(text);
  };

  begin(frameId: number, searchText: string): void {
    this.frameId = frameId;
    this.publish(frameId, { filtering: false, isLoading: true, searchText });
  }

  publish(frameId: number, props: List.Props): void {
    if (frameId !== this.frameId) return;
    this.props = props;
    for (const listener of this.listeners) listener();
  }
}

/** The native List keeps its identity across all folder transitions. */
export function SearchScreenView({ screen }: { screen: SearchScreen }) {
  return (
    <List
      {...useSyncExternalStore(screen.subscribe, screen.getSnapshot)}
      onSearchTextChange={screen.onSearchTextChange}
    />
  );
}

/** A replaceable result view publishes into the persistent native List. */
export function SearchScreenContent({
  screen,
  frameId,
  ...props
}: List.Props & {
  screen: SearchScreen;
  frameId: number;
}) {
  useLayoutEffect(() => () => screen.publish(frameId, {}), [screen, frameId]);
  useLayoutEffect(() => {
    screen.publish(frameId, props);
  });
  return null;
}
