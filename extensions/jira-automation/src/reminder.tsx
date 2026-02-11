import { MenuBarExtra, Icon, launchCommand, LocalStorage, LaunchType } from "@raycast/api";
import { useEffect, useState } from "react";

export default function Command() {
  const [config, setConfig] = useState<{
    time: string;
    days: string[];
    enabled: boolean;
  }>({
    time: "",
    days: [],
    enabled: false,
  });

  const loadConfig = async () => {
    const time = await LocalStorage.getItem<string>("reminderTime");
    const daysStr = await LocalStorage.getItem<string>("reminderDays");
    const enabled = await LocalStorage.getItem<string>("reminderEnabled");

    const parsedConfig = {
      time: time || "",
      days: daysStr ? JSON.parse(daysStr) : [],
      enabled: enabled === "true",
    };
    setConfig(parsedConfig);
    return parsedConfig;
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <MenuBarExtra icon={Icon.Clock} tooltip="Jira Worklog Reminder">
      <MenuBarExtra.Item
        title="Manage Jira Tickets"
        icon={Icon.List}
        onAction={() => launchCommand({ name: "manage-tickets", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title="View Worklog Report"
        icon={Icon.BarChart}
        onAction={() => launchCommand({ name: "worklog-report", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Configure Reminder"
        icon={Icon.Gear}
        onAction={() => launchCommand({ name: "config-reminder", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title={config.enabled ? `Reminding at ${config.time}` : "Reminders are disabled"} />
      {config.enabled && <MenuBarExtra.Item title={`Repeats: ${config.days.join(", ")}`} />}
    </MenuBarExtra>
  );
}
