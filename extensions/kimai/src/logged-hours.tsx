import { LaunchType, MenuBarExtra, launchCommand } from "@raycast/api";
import { useLoggedHoursToday } from "./hooks/useLoggedHoursToday";

const LoggedHoursCommand = () => {
  const { isLoading, hoursToday, hoursWeek, hoursMonth } = useLoggedHoursToday();

  return (
    <MenuBarExtra isLoading={isLoading} title={hoursToday}>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={`Today: ${hoursToday || "00:00"}`} />
        <MenuBarExtra.Item title={`This Week: ${hoursWeek || "00:00"}`} />
        <MenuBarExtra.Item title={`This Month: ${hoursMonth || "00:00"}`} />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Add Time Log"
          onAction={() => launchCommand({ name: "log-time", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Stop Active Timer"
          onAction={() => launchCommand({ name: "stop-timer", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
};

export default LoggedHoursCommand;
