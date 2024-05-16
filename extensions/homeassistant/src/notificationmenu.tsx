import { useHAStates } from "@components/hooks";
import { MenuBarItemConfigureCommand } from "@components/menu";
import { useHAPersistentNotifications } from "@components/persistentnotification/hooks";
import { PersistentNotificationsMenubarSection } from "@components/persistentnotification/list";
import { HAPersistentNotification } from "@components/persistentnotification/utils";
import { UpdatesMenubarSection } from "@components/update/menu";
import { getHACSRepositories } from "@components/update/utils";
import { State } from "@lib/haapi";
import { getErrorMessage } from "@lib/utils";
import { getPreferenceValues, MenuBarExtra } from "@raycast/api";

function showCountInMenu(): boolean {
  const prefs = getPreferenceValues();
  return (prefs.showcount as boolean) === true;
}

function updatesIndicatorPreference(): boolean {
  const prefs = getPreferenceValues();
  const val = prefs.indicatorUpdates as boolean | undefined;
  return val === false ? false : true;
}

export default function MenuCommand(): JSX.Element {
  const { notifications, states, error, isLoading } = useNotifications();
  const updates = states?.filter((s) => s.entity_id.startsWith("update.") && s.state === "on");

  const updatesIndicator = updatesIndicatorPreference();

  const hacs = states?.find((s) => s.entity_id === "sensor.hacs");
  const hacsPendingUpdates = getHACSRepositories(hacs)?.length || 0;
  const messageCount =
    (notifications?.length || 0) + (updatesIndicator ? (updates?.length || 0) + hacsPendingUpdates : 0);
  const valid = messageCount > 0;
  const title = showCountInMenu() && valid ? messageCount.toString() : undefined;
  const tooltip = () => {
    if (!valid) {
      return "No Notifications";
    }
    if (messageCount === 1) {
      return `${messageCount} Notification`;
    }
    return `${messageCount} Notifications`;
  };
  const icon = valid ? "home-assistant-orange.png" : "home-assistant.png";
  const header = error ? getErrorMessage(error) : undefined;
  return (
    <MenuBarExtra icon={icon} isLoading={isLoading} title={title} tooltip={tooltip()}>
      {header && <MenuBarExtra.Item title={header} />}
      <PersistentNotificationsMenubarSection notifications={notifications} />
      <UpdatesMenubarSection updates={updates} hacs={hacs} />
      <MenuBarExtra.Section>
        <MenuBarItemConfigureCommand />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function useNotifications(): {
  error?: string;
  isLoading: boolean;
  notifications?: HAPersistentNotification[];
  states?: State[];
} {
  const {
    notifications,
    isLoading: isLoadingNotifications,
    error: errorNotifications,
  } = useHAPersistentNotifications();
  const { states, isLoading: isLoadingStates, error: errorStates } = useHAStates();

  const isLoading = isLoadingNotifications || isLoadingStates;
  const error = errorNotifications || (errorStates ? getErrorMessage(errorStates) : undefined);
  return { notifications, states, isLoading, error };
}
