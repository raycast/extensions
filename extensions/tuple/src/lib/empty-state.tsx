import { Action, ActionPanel, Detail, Icon, List, open, openExtensionPreferences } from "@raycast/api";
import { ReactNode } from "react";
import { classifyError, TUPLE_DEEP_LINKS } from "./tuple";
import { TupleErrorKind } from "./types";

interface TupleErrorPresentation {
  icon: Icon;
  title: string;
  description: string;
  /** ActionPanel children for this error. `retry` is appended where a "Try Again" affordance fits. */
  actions: (retry: ReactNode) => ReactNode;
}

/**
 * Single source of truth for how each {@link TupleErrorKind} is presented — the same icon, copy, and
 * actions back both the list ({@link TupleErrorEmptyView}) and detail ({@link TupleErrorDetail})
 * surfaces, so a stopped app or missing CLI reads identically wherever it surfaces.
 */
function describeTupleError(error: Error): TupleErrorPresentation {
  const classified = classifyError(error);
  switch (classified.kind) {
    case TupleErrorKind.NotInstalled:
      return {
        icon: Icon.Warning,
        title: "Tuple CLI Not Found",
        description:
          "Install the Tuple CLI from the app’s settings, download Tuple, or set the Tuple CLI Path in preferences.",
        actions: () => (
          <>
            <Action
              title="Open Tuple CLI Settings"
              icon={Icon.Gear}
              onAction={() => open(TUPLE_DEEP_LINKS.integrationSettings)}
            />
            <Action.OpenInBrowser title="Download Tuple" url="https://tuple.app" />
            <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
          </>
        ),
      };
    case TupleErrorKind.DaemonDown:
      return {
        icon: Icon.Warning,
        title: "Tuple Isn’t Running",
        description: "Open the Tuple app, then try again.",
        actions: (retry) => (
          <>
            <Action title="Open Tuple" icon={Icon.Window} onAction={() => open(TUPLE_DEEP_LINKS.open)} />
            {retry}
          </>
        ),
      };
    case TupleErrorKind.TranscriptionUnavailable:
      return {
        icon: Icon.Microphone,
        title: "No Recorded Calls Yet",
        description:
          "Transcription hasn’t run on this Mac. Enable it in Tuple’s transcription settings to start recording calls.",
        actions: (retry) => (
          <>
            <Action
              title="Open Transcription Settings"
              icon={Icon.Gear}
              onAction={() => open(TUPLE_DEEP_LINKS.transcriptionSettings)}
            />
            {retry}
          </>
        ),
      };
    default:
      return {
        icon: Icon.Warning,
        title: "Something Went Wrong",
        description: classified.message,
        actions: (retry) => <>{retry}</>,
      };
  }
}

/**
 * Shared error empty-state for list commands, so every command surfaces a missing CLI, a stopped
 * Tuple app, or a not-yet-set-up transcript store the same way — with a deep link to the right
 * Tuple settings pane. Render this only when there is an error; the no-data empty view stays local
 * to each command since its copy is command-specific.
 */
export function TupleErrorEmptyView({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { icon, title, description, actions } = describeTupleError(error);
  const retry = onRetry ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} /> : null;
  return (
    <List.EmptyView
      icon={icon}
      title={title}
      description={description}
      actions={<ActionPanel>{actions(retry)}</ActionPanel>}
    />
  );
}

/**
 * Detail-view counterpart to {@link TupleErrorEmptyView}: a `Detail` (markdown) view can't host a
 * `List.EmptyView`, so transcript and other detail surfaces render the same classified error here
 * with identical copy and actions. Render this only when there is an error.
 */
export function TupleErrorDetail({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { title, description, actions } = describeTupleError(error);
  const retry = onRetry ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} /> : null;
  return <Detail markdown={`# ${title}\n\n${description}`} actions={<ActionPanel>{actions(retry)}</ActionPanel>} />;
}
