import { LaunchType, MenuBarExtra, launchCommand } from "@raycast/api";
import { useLoggedHoursToday } from "./hooks/useLoggedHoursToday";

const LoggedHoursCommand = () => {
  const { isLoading, hours } = useLoggedHoursToday();

  return (
    <MenuBarExtra isLoading={isLoading} title={hours}>
      <MenuBarExtra.Item
        title="Add Time Log"
        onAction={() => launchCommand({ name: "log-time", type: LaunchType.UserInitiated })}
      />
    </MenuBarExtra>
  );
};

export default LoggedHoursCommand;
