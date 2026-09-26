import { List } from "@raycast/api";
import { ReactNode, useLayoutEffect, useSyncExternalStore } from "react";

/** Owns query text independently of the active result view's publications. */
export class SearchScreen {
  private searchStartedAt = performance.now();
  constructor(
    private frameId = 0,
    private searchText = "",
  ) {
    this.props.searchText = searchText;
  }
  /*
   * What renders before the result view has published anything, and after it
   * unpublishes. Deliberately not `isLoading: true`: a list that is loading and
   * has neither children nor an empty view renders a blank screen, because
   * Raycast withholds the empty view while loading. Without the flag Raycast
   * shows its own default empty view instead, which says something.
   */
  private props: List.Props = {
    filtering: false,
    searchText: "",
  };
  private listeners = new Set<() => void>();

  getSnapshot = (): List.Props => this.props;
  getSearchText = (): string => this.searchText;
  /** Worker input receipt, not native display or compositor timing. */
  getSearchStartedAt = (): number => this.searchStartedAt;
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
    this.searchStartedAt = performance.now();
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
    // Enforced here because every prop set passes through this one place: a
    // loading list with nothing in it is the blank screen, so drop the flag
    // rather than the message. See the field declaration above.
    this.props =
      props.isLoading && !hasChildren(props.children)
        ? { ...props, isLoading: false }
        : props;
    for (const listener of this.listeners) listener();
  }
}

function hasChildren(children: List.Props["children"]): boolean {
  const present = (node: ReactNode): boolean =>
    Array.isArray(node)
      ? node.some(present)
      : node !== null && node !== undefined && node !== false;
  return present(children);
}

/** Preserve the native input instance while this location's results update. */
export function SearchScreenView({
  screen,
  active = true,
}: {
  screen: SearchScreen;
  active?: boolean;
}) {
  const props = useSyncExternalStore(screen.subscribe, screen.getSnapshot);
  return (
    <List
      {...(active ? props : {})}
      filtering={false}
      // Coalesce native keystrokes before changing results. Immediate row
      // updates can overwrite fast typing in Raycast's controlled search bar.
      throttle
      searchText={active ? screen.getSearchText() : ""}
      onSearchTextChange={active ? screen.onSearchTextChange : undefined}
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
