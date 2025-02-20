/**
 * Loading state visualization component.
 * Provides consistent loading feedback across the application.
 * @module
 */

import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useMemo } from "react";

import { LoadingState, HarmonyStage } from "../../types/core/harmony";

interface LoadingViewProps {
  /** Current loading state */
  state: LoadingState;
  /** Optional icon to display */
  icon?: Icon;
  /** Optional description text */
  description?: string;
  /** Optional cancel callback */
  onCancel?: () => void;
  /** Optional retry callback */
  onRetry?: () => void;
}

/**
 * Get the appropriate icon for a loading stage
 */
function getStageIcon(stage: HarmonyStage): Icon {
  switch (stage) {
    case HarmonyStage.DISCOVERING:
      return Icon.MagnifyingGlass;
    case HarmonyStage.CONNECTING:
      return Icon.Network;
    case HarmonyStage.LOADING_DEVICES:
      return Icon.Devices;
    case HarmonyStage.LOADING_ACTIVITIES:
      return Icon.List;
    case HarmonyStage.STARTING_ACTIVITY:
    case HarmonyStage.STOPPING_ACTIVITY:
      return Icon.Play;
    case HarmonyStage.EXECUTING_COMMAND:
      return Icon.Terminal;
    case HarmonyStage.REFRESHING:
      return Icon.ArrowClockwise;
    case HarmonyStage.ERROR:
      return Icon.ExclamationMark;
    default:
      return Icon.Clock;
  }
}

/**
 * Get a user-friendly title for a loading stage
 */
function getStageTitle(stage: HarmonyStage): string {
  switch (stage) {
    case HarmonyStage.DISCOVERING:
      return "Discovering Hubs";
    case HarmonyStage.CONNECTING:
      return "Connecting to Hub";
    case HarmonyStage.LOADING_DEVICES:
      return "Loading Devices";
    case HarmonyStage.LOADING_ACTIVITIES:
      return "Loading Activities";
    case HarmonyStage.STARTING_ACTIVITY:
      return "Starting Activity";
    case HarmonyStage.STOPPING_ACTIVITY:
      return "Stopping Activity";
    case HarmonyStage.EXECUTING_COMMAND:
      return "Executing Command";
    case HarmonyStage.REFRESHING:
      return "Refreshing";
    case HarmonyStage.ERROR:
      return "Error";
    default:
      return "Loading";
  }
}

/**
 * Loading view component that provides consistent loading state visualization.
 */
export function LoadingView({ state, icon, description, onCancel, onRetry }: LoadingViewProps): JSX.Element {
  const stageIcon = icon || getStageIcon(state.stage);
  const stageTitle = getStageTitle(state.stage);

  const markdown = useMemo(() => {
    const sections = [`# ${stageTitle}`, "", state.message];

    if (state.progress > 0) {
      sections.push(
        "",
        `## Progress: ${Math.round(state.progress * 100)}%`,
        "",
        "```",
        `[${"=".repeat(Math.floor(state.progress * 20))}${" ".repeat(20 - Math.floor(state.progress * 20))}]`,
        "```",
      );
    }

    if (description) {
      sections.push("", description);
    }

    return sections.join("\n");
  }, [stageTitle, state.message, description, state.progress]);

  // For short operations or initial loading, use the simple List view
  if (state.stage === HarmonyStage.INITIAL || !state.progress) {
    return (
      <List isLoading={true}>
        <List.EmptyView
          icon={stageIcon}
          title={stageTitle}
          description={state.message}
          actions={
            <ActionPanel>
              {onCancel && (
                <Action
                  title="Cancel"
                  icon={Icon.Xmark}
                  onAction={onCancel}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              )}
              {onRetry && state.stage === HarmonyStage.ERROR && (
                <Action
                  title="Retry"
                  icon={Icon.ArrowClockwise}
                  onAction={onRetry}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              )}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // For operations with progress, use the Detail view with metadata
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {onCancel && (
            <Action
              title="Cancel Operation"
              icon={Icon.Xmark}
              onAction={onCancel}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          )}
          {onRetry && state.stage === HarmonyStage.ERROR && (
            <Action
              title="Retry Operation"
              icon={Icon.ArrowClockwise}
              onAction={onRetry}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={stageTitle}
              color={state.stage === HarmonyStage.ERROR ? "#FF0000" : state.progress >= 1 ? "#00FF00" : "#0066FF"}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Progress" text={`${Math.round(state.progress * 100)}%`} />
          {description && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Details" text={description} />
            </>
          )}
        </Detail.Metadata>
      }
    />
  );
}
