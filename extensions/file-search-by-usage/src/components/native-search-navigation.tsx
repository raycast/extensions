import { useNavigation } from "@raycast/api";
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
  active: boolean,
) => ReactNode;

// Pushed routes are immutable elements. Share only the latest session renderer,
// so settings/setup can update the active route without retaining old sessions.
function createRenderer(initial: RenderFrame) {
  let snapshot = {
    render: initial,
    folder: undefined as SearchFrame | undefined,
  };
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish: (render: RenderFrame, folder?: SearchFrame) => {
      if (snapshot.render === render && snapshot.folder === folder) return;
      snapshot = { render, folder };
      for (const listener of listeners) listener();
    },
    clear: () => {
      snapshot = { render: () => null, folder: undefined };
      listeners.clear();
    },
  };
}

function ActiveFrame({
  renderer,
  frame,
  actions,
  active = true,
  followFolder = false,
}: {
  renderer: ReturnType<typeof createRenderer>;
  frame: SearchFrame;
  actions: NavigationActions;
  active?: boolean;
  followFolder?: boolean;
}) {
  const snapshot = useSyncExternalStore(
    renderer.subscribe,
    renderer.getSnapshot,
  );
  return snapshot.render(
    followFolder ? (snapshot.folder ?? frame) : frame,
    actions,
    active,
  );
}

// Raycast invokes onPop from a state updater. Do not update our owner during
// that render; let the popped folder unmount before restoring global results.
function afterPop(id: number, released: (id: number) => void) {
  return () => queueMicrotask(() => released(id));
}

/** Default results live at the root; only one result producer is mounted. */
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
  const [rootFrame, setRootFrame] = useState<SearchFrame>(navigation.current);
  const [pending, setPending] = useState<SearchFrame | undefined>(
    navigation.current.dir ? navigation.current : undefined,
  );
  const active = useRef<number | undefined>(undefined);
  useLayoutEffect(
    () => renderer.publish(renderFrame, pending),
    [renderer, renderFrame, pending],
  );
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
    });
    if (active.current !== id) return;
    active.current = undefined;
    const startFrame = navigation.reset(navigation.current.id);
    if (startFrame) setRootFrame(startFrame);
    setPending(undefined);
  });
  const onNavigate = useCallback(
    (id: number, target: string, selectedPath?: string) => {
      const next = navigation.navigate(id, target, selectedPath);
      if (next) setPending(next);
    },
    [navigation],
  );
  const onReturnToStart = useCallback(
    (id: number) => {
      const next = navigation.reset(id);
      if (!next) return;
      setRootFrame(next);
      if (active.current !== undefined) pop();
      else setPending(undefined);
    },
    [navigation, pop],
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
        followFolder
        actions={{ onNavigate, onReturnToStart }}
      />,
      afterPop(pending.id, released),
    );
  }, [pending, push, renderer, onNavigate, onReturnToStart, released]);

  // Folder changes replace only the result producer, not the native route.
  // Keep the root input and its native event counter, but release its results
  // before pushing. Remounting that input lets Back restore stale folder text.
  return (
    <ActiveFrame
      renderer={renderer}
      frame={rootFrame}
      active={pending === undefined}
      actions={{ onNavigate, onReturnToStart }}
    />
  );
}
