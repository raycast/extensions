import { MenuBarExtra, Icon, open, openCommandPreferences, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { getMessagesUrl, getAttachmentType } from "./helpers";
import { useMessages } from "./hooks/useMessages";

export default function Command() {
  const { data: messages, isLoading, error } = useMessages();

  const unreadMessages = (messages?.filter((m) => !m.is_read) || []).slice(0, 50);

  if (error && error.message.includes("authorization")) {
    showFailureToast(error, {
      title: "Raycast needs full disk access to read your messages.",
    });
  }

  return (
    <MenuBarExtra
      icon={Icon.Message}
      title={unreadMessages.length > 0 ? unreadMessages.length.toString() : undefined}
      isLoading={isLoading}
    >
      {unreadMessages.length > 0 ? (
        unreadMessages.map((message) => {
          const attachmentType = getAttachmentType(message);

          return (
            <MenuBarExtra.Item
              key={message.guid}
              title={message.senderName}
              subtitle={attachmentType ? attachmentType.text : message.body}
              onAction={() => open(getMessagesUrl(message))}
            />
          );
        })
      ) : (
        <MenuBarExtra.Item title="No unread messages" />
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Messages"
          icon={Icon.Message}
          onAction={() => open("/System/Applications/Messages.app")}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <MenuBarExtra.Item
          title="Send Message"
          icon={Icon.SpeechBubbleActive}
          onAction={() => launchCommand({ name: "send-message", type: LaunchType.UserInitiated })}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          onAction={openCommandPreferences}
          shortcut={{ modifiers: ["cmd"], key: "," }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
