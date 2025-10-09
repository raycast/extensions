/**
 * SandboxActionPanel Component
 * Reusable action panel for sandbox operations
 */

import React from "react";
import { ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { SandboxActionPanelProps } from "../../types/ui";
import { ICONS, KEYBOARD_SHORTCUTS } from "../../lib/constants/ui";
import { isOperationalStatus, isTransitionalStatus } from "../../lib/formatters/statusFormatter";

export const SandboxActionPanel = React.memo<SandboxActionPanelProps>(
  ({ sandbox, onAction, customActions = [], showAllActions = true }) => {
    const isRunning = isOperationalStatus(sandbox.status);
    const isTransitional = isTransitionalStatus(sandbox.status);
    const isStopped = sandbox.status === "stopped";

    return (
      <>
        {/* Primary Actions */}
        {isStopped && (
          <Action
            title="Start Sandbox"
            icon={ICONS.SANDBOX.RUNNING}
            shortcut={KEYBOARD_SHORTCUTS.SANDBOX.START as Keyboard.Shortcut}
            onAction={() => onAction("start")}
          />
        )}

        {isRunning && (
          <Action
            title="Stop Sandbox"
            icon={ICONS.SANDBOX.STOPPED}
            shortcut={KEYBOARD_SHORTCUTS.SANDBOX.STOP as Keyboard.Shortcut}
            onAction={() => onAction("stop")}
          />
        )}

        {isRunning && (
          <Action title="Restart Sandbox" icon={ICONS.ACTIONS.REFRESH} onAction={() => onAction("restart")} />
        )}

        {/* File Management - Only for running sandboxes */}
        {isRunning && (
          <Action
            title="Browse Files"
            icon={ICONS.FILES.FOLDER}
            shortcut={KEYBOARD_SHORTCUTS.SANDBOX.FILES as Keyboard.Shortcut}
            onAction={() => onAction("openFiles")}
          />
        )}

        {/* Git Management - Only for running sandboxes */}
        {isRunning && (
          <Action
            title="Git Manager"
            icon={ICONS.GIT.BRANCH}
            shortcut={KEYBOARD_SHORTCUTS.SANDBOX.GIT as Keyboard.Shortcut}
            onAction={() => onAction("openGitManager")}
          />
        )}

        {/* Custom Actions handled in Global Actions section below */}

        {/* Secondary Actions */}
        <ActionPanel.Section>
          {showAllActions && (
            <Action
              title="Clone Sandbox"
              icon={ICONS.ACTIONS.COPY}
              shortcut={KEYBOARD_SHORTCUTS.SANDBOX.CLONE as Keyboard.Shortcut}
              onAction={() => onAction("clone")}
            />
          )}

          <Action.CopyToClipboard title="Copy Sandbox Id" content={sandbox.id} icon={ICONS.ACTIONS.COPY} />

          {sandbox.repository && (
            <Action.OpenInBrowser title="Open Repository" url={sandbox.repository} icon={ICONS.GIT.BRANCH} />
          )}

          {showAllActions && (
            <Action title="Open Web Terminal" icon={Icon.Globe} onAction={() => onAction("openInBrowser")} />
          )}
        </ActionPanel.Section>

        {/* Global Actions */}
        {customActions.length > 0 && (
          <ActionPanel.Section>
            {customActions.map((action, index) => (
              <Action
                key={action.id || index}
                title={action.title}
                icon={action.icon}
                shortcut={action.shortcut as Keyboard.Shortcut}
                onAction={action.onAction}
              />
            ))}
          </ActionPanel.Section>
        )}

        {/* Destructive Actions */}
        <ActionPanel.Section>
          {!isTransitional && (
            <Action
              title="Delete Sandbox"
              icon={ICONS.ACTIONS.DELETE}
              style={Action.Style.Destructive}
              shortcut={KEYBOARD_SHORTCUTS.SANDBOX.DELETE as Keyboard.Shortcut}
              onAction={() => onAction("delete")}
            />
          )}
        </ActionPanel.Section>
      </>
    );
  },
);

SandboxActionPanel.displayName = "SandboxActionPanel";
