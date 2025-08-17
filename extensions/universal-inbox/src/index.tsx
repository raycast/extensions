import { Action, ActionPanel, Detail, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { GoogleMailNotificationListItem } from "./integrations/google-mail/listitem/GoogleMailNotificationListItem";
import { TodoistNotificationListItem } from "./integrations/todoist/listitem/TodoistNotificationListItem";
import { GithubNotificationListItem } from "./integrations/github/listitem/GithubNotificationListItem";
import { LinearNotificationListItem } from "./integrations/linear/listitem/LinearNotificationListItem";
import { SlackNotificationListItem } from "./integrations/slack/listitem/SlackNotificationListItem";
import { Notification, NotificationListItemProps, NotificationSourceKind } from "./notification";
import { NotificationActions } from "./action/NotificationActions";
import { Page, UniversalInboxPreferences } from "./types";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

export default function Command() {
  const preferences = getPreferenceValues<UniversalInboxPreferences>();

  if (
    preferences.apiKey === undefined ||
    preferences.apiKey === "" ||
    preferences.universalInboxBaseUrl === undefined ||
    preferences.universalInboxBaseUrl === ""
  ) {
    return (
      <Detail
        markdown={"API key incorrect. Please update it in extension preferences and try again."}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const [notificationKind, setNotificationKind] = useState("");
  const { isLoading, data, mutate } = useFetch<Page<Notification>>(
    `${preferences.universalInboxBaseUrl.replace(/\/$/, "")}/api/notifications?status=Unread,Read&with_tasks=true${
      notificationKind ? "&notification_kind=" + notificationKind : ""
    }`,
    {
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
      },
    },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter notifications..."
      searchBarAccessory={
        <NotificationKindDropdown value={notificationKind} onNotificationKindChange={setNotificationKind} />
      }
    >
      {data?.content.length === 0 ? (
        <List.EmptyView
          icon={{ source: "ui-logo-transparent.png" }}
          title="Congrats! You have reach zero inbox 🎉"
          description="You don't have any new notifications."
        />
      ) : (
        data?.content.map((notification: Notification) => {
          return <NotificationListItem key={notification.id} notification={notification} mutate={mutate} />;
        })
      )}
    </List>
  );
}

function NotificationListItem({ notification, mutate }: NotificationListItemProps) {
  switch (notification.kind) {
    case NotificationSourceKind.Github:
      return <GithubNotificationListItem notification={notification} mutate={mutate} />;
    case NotificationSourceKind.Linear:
      return <LinearNotificationListItem notification={notification} mutate={mutate} />;
    case NotificationSourceKind.GoogleMail:
      return <GoogleMailNotificationListItem notification={notification} mutate={mutate} />;
    case NotificationSourceKind.Slack:
      return <SlackNotificationListItem notification={notification} mutate={mutate} />;
    case NotificationSourceKind.Todoist:
      return <TodoistNotificationListItem notification={notification} mutate={mutate} />;
    default:
      return <DefaultNotificationListItem notification={notification} mutate={mutate} />;
  }
}

function DefaultNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  return (
    <List.Item
      key={notification.id}
      title={notification.title}
      subtitle={`#${notification.source_item.source_id}`}
      actions={
        <NotificationActions
          notification={notification}
          detailsTarget={<Detail markdown="# To be implemented 👋" />}
          mutate={mutate}
        />
      }
    />
  );
}

interface NotificationKindDropdownProps {
  value: string;
  onNotificationKindChange: (newValue: string) => void;
}

function NotificationKindDropdown({ value, onNotificationKindChange }: NotificationKindDropdownProps) {
  return (
    <List.Dropdown tooltip="Select Notification Kind" value={value} onChange={onNotificationKindChange}>
      <List.Dropdown.Section title="Notification kind">
        <List.Dropdown.Item key="0" title="" value="" />
        <List.Dropdown.Item key="Github" title="Github" value="Github" />
        <List.Dropdown.Item key="Linear" title="Linear" value="Linear" />
        <List.Dropdown.Item key="GoogleMail" title="Google Mail" value="GoogleMail" />
        <List.Dropdown.Item key="Slack" title="Slack" value="Slack" />
        <List.Dropdown.Item key="Todoist" title="Todoist" value="Todoist" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
