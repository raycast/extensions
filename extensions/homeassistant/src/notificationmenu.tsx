import { getPreferenceValues, Icon, MenuBarExtra, open, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getHAWSConnection, ha } from "./common";
import { getErrorMessage } from "./utils";
import { callService } from "home-assistant-js-websocket";
import { MenuBarItemConfigureCommand } from "./components/menu";

const ensureShort = (text: string): string => {
  const max = 80;
  if (text.length > max) {
    return text.slice(0, max) + " ...";
  }
  return text;
};

function PersistentNotificationMenuItem(props: { notification: HANotification }): JSX.Element {
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
    <MenuBarExtra.Submenu icon={Icon.SpeechBubbleActive} title={ensureShort(title ? title : msg)}>
      <MenuBarExtra.Item title="Open" icon={Icon.Globe} onAction={() => open(ha.url)} tooltip={tt} />
      <MenuBarExtra.Item title="Dismiss" icon={Icon.XMarkCircle} onAction={dismiss} />
    </MenuBarExtra.Submenu>
  );
}

function showCountInMenu(): boolean {
  const prefs = getPreferenceValues();
  return (prefs.showcount as boolean) === true;
}

export default function MenuCommand(): JSX.Element {
  const { notifications, error, isLoading } = useHANotifications();
  const valid = notifications && notifications.length > 0 ? true : false;
  const title = showCountInMenu() && valid ? notifications?.length.toString() : undefined;
  const tooltip = () => {
    if (!valid) {
      return "No Notifications";
    }
    if (notifications?.length === 1) {
      return `${notifications?.length} Notification`;
    }
    return `${notifications?.length} Notifications`;
  };
  const icon = valid ? "home-assistant-orange.png" : "home-assistant.png";
  let header = valid ? "Notifications" : "No Notifications";
  if (error) {
    header = getErrorMessage(error);
  }
  return (
    <MenuBarExtra icon={icon} isLoading={isLoading} title={title} tooltip={tooltip()}>
      <MenuBarExtra.Item key="_header" title={header} />
      {notifications?.map((n) => <PersistentNotificationMenuItem key={n.notification_id} notification={n} />)}
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

interface HANotification {
  message: string;
  notification_id: string;
  title?: string;
  created_at: string;
}

function useHANotifications(): {
  error?: string;
  isLoading: boolean;
  notifications?: HANotification[];
} {
  const [notifications, setNotifications] = useState<HANotification[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const con = await getHAWSConnection();
        const data: HANotification[] | undefined = await con.sendMessagePromise({
          type: "persistent_notification/get",
        });
        if (!didUnmount) {
          setNotifications(data);
        }
      } catch (error) {
        if (!didUnmount) {
          setError(getErrorMessage(error));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, []);

  return { error, isLoading, notifications };
}
