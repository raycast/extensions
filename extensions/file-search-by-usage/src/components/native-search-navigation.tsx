import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useSyncExternalStore,
} from "react";
import { FolderFrame, FolderNavigation } from "../lib/folder-navigation";
import { useEventHandles } from "./use-event-handles";
import { traceNavigation } from "../lib/navigation-diagnostics";

export type SearchFrame = FolderFrame & { initialQuery?: string };
export type NavigationActions = {
  onNavigate: (fromId: number, target: string, selectedPath?: string) => void;
  onReturnToStart: (fromId: number) => void;
};
type RenderFrame = (
  frame: SearchFrame,
  actions: NavigationActions,
) => ReactNode;

// Pushed routes are immutable elements. Share only the latest session renderer,
// so settings/setup can update the active route without retaining old sessions.
function createRenderer(initial: RenderFrame) {
  let render = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => render,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish: (next: RenderFrame) => {
      if (render === next) return;
      render = next;
      for (const listener of listeners) listener();
    },
    clear: () => {
      render = () => null;
      listeners.clear();
    },
  };
}

function ActiveFrame({
  renderer,
  frame,
  actions,
}: {
  renderer: ReturnType<typeof createRenderer>;
  frame: SearchFrame;
  actions: NavigationActions;
}) {
  const render = useSyncExternalStore(renderer.subscribe, renderer.getSnapshot);
  return render(frame, actions);
}

// Raycast invokes onPop from a state updater. Do not update our owner during
// that render; let the popped route unmount before requesting its replacement.
function afterPop(id: number, released: (id: number) => void) {
  return () => queueMicrotask(() => released(id));
}

/** At most two native routes: an empty root and one replaceable search view. */
export function NativeSearchNavigation({
  navigation,
  renderFrame,
}: {
  navigation: FolderNavigation;
  renderFrame: RenderFrame;
}) {
  const { push, pop } = useNavigation();
  const event = useEventHandles();
  const [renderer] = useState(() => createRenderer(renderFrame));
  const [pending, setPending] = useState<SearchFrame | undefined>(
    navigation.current,
  );
  const [rootQuery, setRootQuery] = useState("");
  const active = useRef<number | undefined>(undefined);
  const replacement = useRef<SearchFrame | undefined>(undefined);
  useLayoutEffect(() => renderer.publish(renderFrame), [renderer, renderFrame]);
  useEffect(() => {
    traceNavigation("navigation-root-mounted", { nativeRoutes: 1 });
    return () => {
      renderer.clear();
      traceNavigation("navigation-root-unmounted", {});
    };
  }, [renderer]);

  const released = event("released", (id: number) => {
    traceNavigation("native-route-popped", {
      frameId: id,
      active: active.current,
      next: replacement.current?.id,
    });
    if (active.current !== id) return;
    active.current = undefined;
    const next = replacement.current;
    replacement.current = undefined;
    if (!next) navigation.reset(navigation.current.id);
    setRootQuery("");
    setPending(next);
  });
  const replace = useCallback(
    (next: FolderFrame | undefined) => {
      if (!next) return;
      if (active.current === undefined) setPending(next);
      else {
        traceNavigation("native-route-replacing", {
          frameId: active.current,
          next: next.id,
        });
        replacement.current = next;
        pop();
      }
    },
    [pop],
  );
  const onNavigate = useCallback(
    (id: number, target: string, selectedPath?: string) => {
      replace(navigation.navigate(id, target, selectedPath));
    },
    [navigation, replace],
  );
  const onReturnToStart = useCallback(
    (id: number) => {
      replace(navigation.reset(id));
    },
    [navigation, replace],
  );

  useEffect(() => {
    if (!pending || active.current !== undefined) return;
    active.current = pending.id;
    traceNavigation("native-route-pushed", {
      frameId: pending.id,
      nativeRoutes: 2,
    });
    push(
      <ActiveFrame
        renderer={renderer}
        frame={pending}
        actions={{ onNavigate, onReturnToStart }}
      />,
      afterPop(pending.id, released),
    );
  }, [pending, push, renderer, onNavigate, onReturnToStart, released]);

  const start = useCallback(
    (text = "") => {
      if (active.current !== undefined) return;
      const next = navigation.reset(navigation.current.id);
      if (next) setPending({ ...next, initialQuery: text });
    },
    [navigation],
  );
  // Buffer typing on the lightweight root before opening a new native input.
  // Otherwise a rapid burst could straddle the root and new route's fields.
  useEffect(() => {
    if (!rootQuery || active.current !== undefined) return;
    const timer = setTimeout(() => start(rootQuery), 250);
    return () => clearTimeout(timer);
  }, [rootQuery, start]);
  return (
    <List
      filtering={false}
      searchText={rootQuery}
      searchBarPlaceholder="Search files and folders everywhere…"
      onSearchTextChange={event("startQuery", (text: string) => {
        if (active.current === undefined) setRootQuery(text);
      })}
      actions={
        <ActionPanel>
          <Action
            title="Start Search"
            onAction={event("start", () => start(rootQuery))}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="Search Files and Folders"
        description="Type to search, or press Return to show recent files and places."
      />
    </List>
  );
}
