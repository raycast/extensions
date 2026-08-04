/**
 * Reusable Raycast action panel section for event lists and drill-down screens.
 *
 * @module components/shared-actions
 */

import { Action, ActionPanel, Icon, Keyboard, open, showToast, Toast } from "@raycast/api";
import { getUserFriendlyMessage } from "../lib/errors";

/** Props for {@link SharedActionsSection}. */
type SharedActionsSectionProps = {
  readonly eventDir?: string;
  readonly onRefresh: () => void | Promise<void>;
  readonly onSelectFolders?: (() => void) | undefined;
};

/**
 * Renders Finder open, copy path, refresh, and optional change-source-folder actions.
 *
 * @param props - Optional `eventDir` plus refresh and folder-picker callbacks.
 * @returns `ActionPanel.Section` fragment for list item action panels.
 */
export function SharedActionsSection({ eventDir, onRefresh, onSelectFolders }: SharedActionsSectionProps) {
  return (
    <ActionPanel.Section>
      {eventDir ? (
        <>
          <Action
            title="Open in Finder"
            icon={Icon.Finder}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => {
              void open(eventDir).catch(async (error) => {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not open folder",
                  message: getUserFriendlyMessage(error),
                });
              });
            }}
          />
          <Action.CopyToClipboard title="Copy Path" content={eventDir} shortcut={Keyboard.Shortcut.Common.CopyPath} />
        </>
      ) : null}
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => void onRefresh()}
      />
      {onSelectFolders ? (
        <Action
          title="Change Source Folders"
          icon={Icon.Folder}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
          onAction={onSelectFolders}
        />
      ) : null}
    </ActionPanel.Section>
  );
}
