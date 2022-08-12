import { getPreferenceValues, MenuBarExtra, open } from "@raycast/api";
import { ha } from "./common";
import { State } from "./haapi";
import { useHAStates } from "./hooks";
import { getErrorMessage } from "./utils";

function PersistentNotificationMenuItem(props: { state: State }): JSX.Element {
  const ensureShort = (text: string): string => {
    const max = 40;
    if (text.length > max) {
      return text.slice(0, max) + " ...";
    }
    return text;
  };
  const s = props.state;
  const fn = s.attributes.friendly_name || s.entity_id;
  const title = s.attributes.title;
  const msg = s.attributes.message || fn;
  const tt = title ? `${title}: ${msg}` : msg;
  return (
    <MenuBarExtra.Item icon="💬" title={ensureShort(title ? title : msg)} onAction={() => open(ha.url)} tooltip={tt} />
  );
}

function showCountInMenu(): boolean {
  const prefs = getPreferenceValues();
  return (prefs.showcount as boolean) === true;
}

export default function MenuCommand(): JSX.Element {
  const { states: allStates, error, isLoading } = useHAStates();
  const notifications = getPersistentNotifications(allStates);
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
      {notifications?.map((n) => (
        <PersistentNotificationMenuItem key={n.entity_id} state={n} />
      ))}
    </MenuBarExtra>
  );
}

function getPersistentNotifications(allStates?: State[]): State[] | undefined {
  if (!allStates || allStates.length <= 0) {
    return;
  }
  return allStates.filter((s) => s.entity_id.startsWith("persistent_notification."));
}
