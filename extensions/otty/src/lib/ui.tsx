import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  Grid,
  Icon,
  Image,
  List,
  openExtensionPreferences,
  PopToRootType,
} from "@raycast/api";
import { useCachedState, useLocalStorage } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { OttyCliMissingError, OttyNotRunningError, openNewWindow, showFailure } from "./otty";
import { agentStatus, type AgentState, type AgentTone } from "./workspace";

const TONE_COLORS: Record<AgentTone, Color | undefined> = {
  orange: Color.Orange,
  blue: Color.Blue,
  default: undefined,
  secondary: Color.SecondaryText,
};

/** Otty's own "terminal AI" glyph, from its app bundle (view-icons/terminal-ai.svg), rendered to a PNG so the menu bar and list share one file. */
export const AGENT_ICON = "agent-icon.png";

// Raycast icons cannot animate, so a working agent cycles through these.
const SPINNER_FRAMES = [Icon.CircleProgress25, Icon.CircleProgress50, Icon.CircleProgress75, Icon.CircleProgress100];

/**
 * The row icon carries agent status: a spinner while working, a bell when the
 * agent needs input, sparkles when idle, and `fallback` when no agent is present.
 */
export function statusIcon(
  agent: string,
  state: AgentState,
  fallback: Image.ImageLike,
  frame = 0,
): { value: Image.ImageLike; tooltip: string } {
  const status = agentStatus(state);
  if (!status) return { value: fallback, tooltip: "No agent" };

  const source =
    state === "processing"
      ? SPINNER_FRAMES[frame % SPINNER_FRAMES.length]
      : state === "awaiting"
        ? Icon.Bell
        : AGENT_ICON;
  // The agent glyph is a bundled single-color SVG, so it is always tinted.
  const tintColor = TONE_COLORS[status.tone] ?? (source === AGENT_ICON ? Color.PrimaryText : undefined);
  return {
    value: tintColor ? { source, tintColor } : source,
    tooltip: `${agent || "Agent"}: ${status.label}`,
  };
}

/** Run an action against Otty, then close Raycast; on failure, toast instead. */
export async function runAndClose(failureTitle: string, run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run();
    await closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
    return true;
  } catch (error) {
    await showFailure(failureTitle, error);
    return false;
  }
}

/**
 * When a refresh fails while cached data is still on screen, the view would
 * otherwise look current, so toast once per distinct failure, not every poll.
 */
export function useRefreshFailureToast(error: unknown, showingCachedData: boolean, title: string) {
  const reported = useRef<string | undefined>(undefined);
  useEffect(() => {
    const message = error ? (error instanceof Error ? error.message : String(error)) : undefined;
    if (!message) {
      reported.current = undefined;
    } else if (showingCachedData && reported.current !== message) {
      reported.current = message;
      showFailure(title, error);
    }
  }, [error, showingCachedData]);
}

/**
 * View state that must survive a Raycast relaunch (sidebar, preview, filters).
 * The cache gives an instant first render; LocalStorage is the durable copy,
 * and wins on launch if the cache was reset (as a dev rebuild can do).
 */
export function usePersistentState<T>(key: string, initial: T): [T, (next: T | ((current: T) => T)) => void] {
  const [value, setValue] = useCachedState<T>(key, initial);
  const { value: stored, setValue: store, isLoading } = useLocalStorage<T>(key);
  useEffect(() => {
    if (!isLoading && stored !== undefined) setValue(stored);
  }, [isLoading, stored]);
  const update = (next: T | ((current: T) => T)) => {
    const resolved = typeof next === "function" ? (next as (current: T) => T)(value) : next;
    setValue(resolved);
    store(resolved);
  };
  return [value, update];
}

/** Show/Hide Sidebar (⌘⇧D), shared by the list commands with a detail pane. */
export function ToggleSidebarAction({ showDetail, onToggle }: { showDetail: boolean; onToggle: () => void }) {
  return (
    <Action
      title={showDetail ? "Hide Sidebar" : "Show Sidebar"}
      icon={Icon.AppWindowSidebarRight}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "d" },
        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
      }}
      onAction={onToggle}
    />
  );
}

/** Call `callback` every `delay` ms; pass `null` to pause. */
export function useInterval(callback: () => void, delay: number | null) {
  const saved = useRef(callback);
  saved.current = callback;
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

/** Advances a spinner frame counter while `active`. */
export function useSpinnerFrame(active: boolean): number {
  const [frame, setFrame] = useState(0);
  useInterval(() => setFrame((value) => value + 1), active ? 250 : null);
  return frame;
}

export function isOttyUnavailable(error: unknown): boolean {
  return error instanceof OttyNotRunningError || error instanceof OttyCliMissingError;
}

/**
 * The empty view for a failed load: "Otty isn't running" and "CLI not found"
 * get their own fix-it actions; anything else shows the error with Copy Error.
 */
export function LoadFailureView({
  title,
  error,
  onRetry,
  grid = false,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
  grid?: boolean;
}) {
  const EmptyView = grid ? Grid.EmptyView : List.EmptyView;

  if (error instanceof OttyNotRunningError) {
    return (
      <EmptyView
        icon={Icon.Terminal}
        title="Otty Isn't Running"
        description="Open Otty to see its windows, tabs, and panes."
        actions={
          <ActionPanel>
            <Action
              title="Open Otty"
              icon={Icon.Terminal}
              onAction={async () => {
                await openNewWindow();
                onRetry();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (error instanceof OttyCliMissingError) {
    return (
      <EmptyView
        icon={Icon.ExclamationMark}
        title="Otty CLI Not Found"
        description="Set the Otty CLI Path in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    <EmptyView
      icon={Icon.Warning}
      title={title}
      description={errorMessage}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action.CopyToClipboard title="Copy Error" content={errorMessage} />
        </ActionPanel>
      }
    />
  );
}
