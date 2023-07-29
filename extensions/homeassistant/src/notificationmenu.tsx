import { getPreferenceValues, MenuBarExtra } from "@raycast/api";
import { getErrorMessage } from "@lib/utils";
import { MenuBarItemConfigureCommand } from "@components/menu";
import { useHAStates } from "@components/hooks";
import { State } from "@lib/haapi";
import { filterBatteries } from "@components/battery/utils";
import { BatteriesMenubarSection } from "@components/battery/menu";
import { HAPersistentNotification } from "@components/persistentnotification/utils";
import { useHAPersistentNotifications } from "@components/persistentnotification/hooks";
import { PersistentNotificationsMenubarSection } from "@components/persistentnotification/list";
import { UpdatesMenubarSection } from "@components/update/menu";

function showCountInMenu(): boolean {
  const prefs = getPreferenceValues();
  return (prefs.showcount as boolean) === true;
}

export default function MenuCommand(): JSX.Element {
  const { notifications, states, error, isLoading } = useNotifications();
  const updates = states?.filter((s) => s.entity_id.startsWith("update.") && s.state === "on");
  const batteries = filterBatteries(states, { onFilterState: (value) => value < 30 });

  const messageCount = (notifications?.length || 0) + (updates?.length || 0) + (batteries?.length || 0);
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
      <UpdatesMenubarSection updates={updates} />
      <BatteriesMenubarSection batteries={batteries} />
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
