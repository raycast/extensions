/**
 * EmptyState Component
 * Reusable empty state component for different contexts
 */

import React from "react";
import { List, ActionPanel, Action } from "@raycast/api";
import { EmptyStateProps } from "../../types/ui";
import { ICONS, MESSAGES } from "../../lib/constants/ui";

const getEmptyStateConfig = (type: EmptyStateProps["type"]) => {
  switch (type) {
    case "sandbox":
      return {
        icon: ICONS.SANDBOX.STOPPED,
        ...MESSAGES.EMPTY_STATES.NO_SANDBOXES,
      };
    case "snapshot":
      return {
        icon: ICONS.FILES.FILE,
        ...MESSAGES.EMPTY_STATES.NO_SNAPSHOTS,
      };
    case "file":
      return {
        icon: ICONS.FILES.FOLDER,
        ...MESSAGES.EMPTY_STATES.NO_FILES,
      };
    case "git":
      return {
        icon: ICONS.GIT.STATUS,
        ...MESSAGES.EMPTY_STATES.NO_GIT_CHANGES,
      };
    case "search":
      return {
        icon: ICONS.ACTIONS.SEARCH,
        ...MESSAGES.EMPTY_STATES.NO_SEARCH_RESULTS,
      };
    case "execution":
      return {
        icon: ICONS.EXECUTION.RUN,
        ...MESSAGES.EMPTY_STATES.NO_HISTORY,
      };
    default:
      return {
        icon: ICONS.STATUS.INFO,
        title: "No Data",
        description: "No data available to display",
      };
  }
};

export const EmptyState = React.memo<EmptyStateProps>(({ type, title, description, icon, actions = [] }) => {
  const config = getEmptyStateConfig(type);
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayIcon = icon || config.icon;

  return (
    <List.EmptyView
      icon={displayIcon}
      title={displayTitle}
      description={displayDescription}
      actions={
        actions.length > 0 ? (
          <ActionPanel>
            {actions.map((action) => (
              <Action key={action.id} title={action.title} icon={action.icon} onAction={action.action} />
            ))}
          </ActionPanel>
        ) : undefined
      }
    />
  );
});

EmptyState.displayName = "EmptyState";
