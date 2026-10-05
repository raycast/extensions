import { ActionPanel, Action, Icon } from "@raycast/api";
import { useLogout } from "./AuthWrapper";
import { getNoteUrl, FEEDBACK_URL } from "../lib/config";

/**
 * Global actions section for note/snippet contexts.
 * Includes Open in Web, Send Feedback, optional Lock, and Logout.
 */
export function GlobalActionsSection({
  noteId,
  showLock,
  onLock,
}: {
  noteId?: string;
  showLock?: boolean;
  onLock?: () => void;
}) {
  const handleLogout = useLogout();

  return (
    <ActionPanel.Section>
      {noteId && (
        <Action.OpenInBrowser
          title="Open in Web"
          url={getNoteUrl(noteId)}
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        />
      )}
      <Action.OpenInBrowser
        title="Send Feedback"
        url={FEEDBACK_URL}
        icon={Icon.Megaphone}
      />
      {showLock && onLock && (
        <Action
          title="Lock Protected Notes"
          icon={Icon.Lock}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          onAction={onLock}
        />
      )}
      <Action title="Logout" icon={Icon.Logout} onAction={handleLogout} />
    </ActionPanel.Section>
  );
}

/**
 * Utility actions section for empty views and simple lists.
 * Includes Send Feedback and Logout.
 */
export function UtilityActionsSection() {
  const handleLogout = useLogout();

  return (
    <ActionPanel.Section>
      <Action.OpenInBrowser
        title="Send Feedback"
        url={FEEDBACK_URL}
        icon={Icon.Megaphone}
      />
      <Action title="Logout" icon={Icon.Logout} onAction={handleLogout} />
    </ActionPanel.Section>
  );
}
