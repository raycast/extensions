/**
 * SandboxItem Component
 * Reusable sandbox list item with consistent styling and actions
 */

import React from "react";
import { List, ActionPanel } from "@raycast/api";
import { SandboxItemProps } from "../../types/ui";
import { formatRelativeTime } from "../../lib/formatters/dateFormatter";
import { formatSandboxStatus } from "../../lib/formatters/statusFormatter";
import { formatRepositoryUrl, getRepositoryShortName } from "../../lib/formatters/urlFormatter";
import { SandboxActionPanel } from "./SandboxActionPanel";

export const SandboxItem = React.memo<SandboxItemProps>(
  ({ sandbox, onAction, showRepository = true, showMetadata = false, compact = false, customActions }) => {
    const statusDisplay = formatSandboxStatus(sandbox.status);
    const formattedDate = formatRelativeTime(sandbox.createdAt);
    const repositoryDisplay = sandbox.repository
      ? showRepository
        ? formatRepositoryUrl(sandbox.repository, 40)
        : getRepositoryShortName(sandbox.repository)
      : undefined;

    // Build accessories array
    const accessories = [];

    if (showMetadata && sandbox.updatedAt) {
      accessories.push({ text: `Updated ${formatRelativeTime(sandbox.updatedAt)}` });
    }

    if (!compact) {
      accessories.push({
        text: statusDisplay.text,
        icon: { source: statusDisplay.icon, tintColor: statusDisplay.color },
        tooltip: statusDisplay.tooltip,
      });
    }

    // Build subtitle
    const subtitleParts = [];
    if (repositoryDisplay) subtitleParts.push(repositoryDisplay);
    if (compact) subtitleParts.push(statusDisplay.text);
    if (!showMetadata) subtitleParts.push(`Created ${formattedDate}`);

    const subtitle = subtitleParts.join(" • ");

    return (
      <List.Item
        id={sandbox.id}
        title={sandbox.name}
        subtitle={subtitle}
        icon={{ source: statusDisplay.icon, tintColor: statusDisplay.color }}
        accessories={accessories}
        actions={
          onAction ? (
            <ActionPanel>
              <SandboxActionPanel
                sandbox={sandbox}
                onAction={(action) => onAction(action, sandbox)}
                customActions={customActions}
              />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  },
);

SandboxItem.displayName = "SandboxItem";
