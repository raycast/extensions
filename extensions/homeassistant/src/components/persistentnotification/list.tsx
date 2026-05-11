import { getHAWSConnection, ha } from "@lib/common";
import { ensureShort, getErrorMessage } from "@lib/utils";
import { Icon, MenuBarExtra, Toast, open, showToast } from "@raycast/api";
import { callService } from "home-assistant-js-websocket";
import React from "react";
import { HAPersistentNotification } from "./utils";

export function PersistentNotificationMenuItem(props: { notification: HAPersistentNotification }): React.ReactElement {
  const s = props.notification;
  const dismiss = async () => {
    try {
      const con = await getHAWSConnection();
      await callService(con, "persistent_notification", "dismiss", { notification_id: s.notification_id });
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: getErrorMessage(error) });
    }
  };
  const title = s.title;
  const msg = s.message ?? "?";
  const tt = title ? `${title}: ${msg}` : msg;
  return (
    <MenuBarExtra.Submenu icon={Icon.SpeechBubbleActive} title={ensureShort(title ? title : msg) || ""}>
      <MenuBarExtra.Item title="Open" icon={Icon.Globe} onAction={() => open(ha.url)} tooltip={tt} />
      <MenuBarExtra.Item title="Dismiss" icon={Icon.XMarkCircle} onAction={dismiss} />
    </MenuBarExtra.Submenu>
  );
}

export function PersistentNotificationsMenubarSection(props: {
  notifications: HAPersistentNotification[] | undefined;
}) {
  const notifications = props.notifications;
  if (!notifications || notifications.length <= 0) {
    return (
      <MenuBarExtra.Section title="Notifications">
        <MenuBarExtra.Item title="No Notifications" />
      </MenuBarExtra.Section>
    );
  }
  return (
    <MenuBarExtra.Section title="Notifications">
      {notifications?.map((n) => (
        <PersistentNotificationMenuItem key={n.notification_id} notification={n} />
      ))}
    </MenuBarExtra.Section>
  );
}
