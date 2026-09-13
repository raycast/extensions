import { List } from "@raycast/api";
import { useLayoutEffect, useSyncExternalStore } from "react";

/** Owns query text independently of the active result view's publications. */
export class SearchScreen {
  constructor(
    private frameId = 0,
    private searchText = "",
  ) {
    this.props.searchText = searchText;
  }
  private props: List.Props = {
    filtering: false,
    isLoading: true,
    searchText: "",
  };
  private listeners = new Set<() => void>();

  getSnapshot = (): List.Props => this.props;
  getSearchText = (): string => this.searchText;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  onSearchTextChange = (text: string): void => {
    const onChange = this.props.onSearchTextChange;
    // Raycast must receive the new text in the same commit as its input counter.
    this.setSearchText(this.frameId, text);
    onChange?.(text);
  };

  setSearchText(frameId: number, searchText: string): void {
    if (frameId !== this.frameId || searchText === this.getSearchText()) return;
    this.searchText = searchText;
    this.update({ ...this.props, searchText });
  }

  publish(frameId: number, props: List.Props): void {
    if (frameId !== this.frameId) return;
    this.update({ ...props, searchText: this.getSearchText() });
  }

  clear(frameId: number): void {
    // Release rows and callbacks, but preserve the small query across effect replay.
    if (frameId === this.frameId) this.update({});
  }

  private update(props: List.Props): void {
    this.props = props;
    for (const listener of this.listeners) listener();
  }
}

/** Preserve the native input instance while this location's results update. */
export function SearchScreenView({ screen }: { screen: SearchScreen }) {
  return (
    <List
      {...useSyncExternalStore(screen.subscribe, screen.getSnapshot)}
      onSearchTextChange={screen.onSearchTextChange}
    />
  );
}

/** Publish results into this route's input owner, without rewriting its query. */
export function SearchScreenContent({
  screen,
  frameId,
  ...props
}: List.Props & {
  screen: SearchScreen;
  frameId: number;
}) {
  useLayoutEffect(() => () => screen.clear(frameId), [screen, frameId]);
  useLayoutEffect(() => {
    screen.publish(frameId, props);
  });
  return null;
}
