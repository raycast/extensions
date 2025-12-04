import React from 'react';
import * as Raycast from '@raycast/api';
import { exec } from 'child_process';

// Extract simple components
const showToast = Raycast.showToast;
const Toast = Raycast.Toast;

// Define proper types for List to avoid 'any' usage and interface extension issues
interface ListProps {
  isLoading?: boolean;
  navigationTitle?: string;
  children?: React.ReactNode;
}

interface ListComponent {
  (props: ListProps): React.ReactElement | null;
  Item: React.ComponentType<Record<string, unknown>>;
  Section: React.ComponentType<Record<string, unknown>>;
  EmptyView: React.ComponentType<Record<string, unknown>>;
}

// Define proper types for ActionPanel
interface ActionPanelProps {
  children?: React.ReactNode;
}

interface ActionPanelComponent {
  (props: ActionPanelProps): React.ReactElement | null;
  Section: React.ComponentType<Record<string, unknown>>;
}

// Define proper types for Action
interface ActionProps {
  title: string;
  icon?: unknown;
  onAction?: () => void;
  shortcut?: unknown;
}

interface ActionComponent {
  (props: ActionProps): React.ReactElement | null;
  OpenInBrowser: React.ComponentType<Record<string, unknown>>;
  Push: React.ComponentType<Record<string, unknown>>;
  Pop: React.ComponentType<Record<string, unknown>>;
  Copy: React.ComponentType<Record<string, unknown>>;
  Paste: React.ComponentType<Record<string, unknown>>;
  ShowInFinder: React.ComponentType<Record<string, unknown>>;
  Open: React.ComponentType<Record<string, unknown>>;
  OpenWith: React.ComponentType<Record<string, unknown>>;
  SubmitForm: React.ComponentType<Record<string, unknown>>;
  Trash: React.ComponentType<Record<string, unknown>>;
}

// Type assertions to bypass the complex intersection type issues
const List = (Raycast as unknown as { List: ListComponent }).List;
const ActionPanel = (
  Raycast as unknown as { ActionPanel: ActionPanelComponent }
).ActionPanel;
const Action = (Raycast as unknown as { Action: ActionComponent }).Action;

export default function Command() {
  const runCommand = (command: string) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        showToast(
          Toast.Style.Failure,
          'Failed to execute command',
          error.message
        );
        return;
      }
      showToast(
        Toast.Style.Success,
        'Command executed successfully',
        stdout || stderr
      );
    });
  };

  return (
    <List>
      <List.Item
        title="Activate Mozilla VPN"
        actions={
          <ActionPanel>
            <Action
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Activate VPN"
              onAction={() =>
                runCommand(
                  '/Applications/Mozilla\\ VPN.app/Contents/MacOS/Mozilla\\ VPN activate'
                )
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Deactivate Mozilla VPN"
        actions={
          <ActionPanel>
            <Action
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Deactivate VPN"
              onAction={() =>
                runCommand(
                  '/Applications/Mozilla\\ VPN.app/Contents/MacOS/Mozilla\\ VPN deactivate'
                )
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
