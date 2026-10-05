import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  getNotifications,
  markNotificationRead,
  getMoodlePrefs,
} from "./api/moodle";
import { formatDateTime, stripHtml } from "./utils/formatters";

export default function NotificationsCommand() {
  const { moodleUrl } = getMoodlePrefs();
  const [filter, setFilter] = useState<string>("all");

  const {
    data: response,
    isLoading,
    error,
    revalidate,
  } = usePromise(getNotifications, [], {
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load notifications",
        message: err.message,
      });
    },
  });

  const notifications = response?.notifications || [];

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.read;
    if (filter === "read") return notif.read;
    return true;
  });

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search notifications and announcements..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Notifications"
          value={filter}
          onChange={setFilter}
        >
          <List.Dropdown.Item
            title={`All Notifications (${notifications.length})`}
            value="all"
          />
          <List.Dropdown.Item
            title={`Unread Only (${notifications.filter((n) => !n.read).length})`}
            value="unread"
          />
          <List.Dropdown.Item title="Read" value="read" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could not load notifications"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Retry"
                icon={Icon.RotateAntiClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : filteredNotifications.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="All Caught Up!"
          description={
            filter === "unread"
              ? "You have no unread notifications or announcements."
              : "No notifications found."
          }
        />
      ) : (
        filteredNotifications.map((notif) => {
          const detailMarkdown = `
# ${notif.subject || "Notification"}

**From**: ${notif.userfromfullname || "System"}${
            notif.contexturlname
              ? ` • **Context**: ${notif.contexturlname}`
              : ""
          }  
**Received**: ${formatDateTime(notif.timecreated)}

---

${stripHtml(notif.fullmessagehtml || notif.fullmessage || notif.text) || "*No content*"}
`;

          const contextUrl =
            notif.contexturl ||
            `${moodleUrl}/message/output/popup/notifications.php`;

          return (
            <List.Item
              key={notif.id}
              icon={{
                source: notif.read ? Icon.Envelope : Icon.Envelope,
                tintColor: notif.read ? Color.SecondaryText : Color.Blue,
              }}
              title={notif.subject || notif.userfromfullname || "Notification"}
              subtitle={notif.userfromfullname}
              accessories={[
                ...(!notif.read
                  ? [
                      {
                        tag: {
                          value: "Unread",
                          color: Color.Blue,
                        },
                      },
                    ]
                  : []),
                { text: formatDateTime(notif.timecreated) },
              ]}
              detail={
                <List.Item.Detail
                  markdown={detailMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Status"
                        text={notif.read ? "Read" : "Unread"}
                        icon={
                          notif.read
                            ? { source: Icon.Check, tintColor: Color.Green }
                            : { source: Icon.Dot, tintColor: Color.Blue }
                        }
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Sender"
                        text={notif.userfromfullname || "System"}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Date"
                        text={formatDateTime(notif.timecreated)}
                      />
                      {notif.contexturlname ? (
                        <List.Item.Detail.Metadata.Label
                          title="Context"
                          text={notif.contexturlname}
                        />
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Notification Actions">
                    {notif.contexturl ? (
                      <Action.OpenInBrowser
                        title="Open in Moodle"
                        url={notif.contexturl}
                      />
                    ) : (
                      <Action.OpenInBrowser
                        title="Open Notifications in Moodle"
                        url={contextUrl}
                      />
                    )}
                    {!notif.read && (
                      <Action
                        title="Mark as Read"
                        icon={Icon.Check}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                        onAction={async () => {
                          try {
                            await markNotificationRead(notif.id);
                            showToast({
                              style: Toast.Style.Success,
                              title: "Marked as read",
                            });
                            revalidate();
                          } catch (e) {
                            showToast({
                              style: Toast.Style.Failure,
                              title: "Failed to mark as read",
                              message:
                                e instanceof Error
                                  ? e.message
                                  : "Unknown error",
                            });
                          }
                        }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Clipboard">
                    <Action.CopyToClipboard
                      title="Copy Message Text"
                      content={stripHtml(notif.fullmessage || notif.text)}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Refresh Notifications"
                      icon={Icon.RotateAntiClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={revalidate}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
