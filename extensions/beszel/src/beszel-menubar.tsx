import { Icon, MenuBarExtra } from "@raycast/api";

import { useListCollection } from "./hooks/use-list-collection";
import { System } from "./types/system";
import type { Alert } from "./types/alert";
import { SystemMenuBarItem } from "./components/SystemMenuBarItem";
import { usePreferences } from "./hooks/use-preferences";

export default function BeszelMenubarCommand() {
  const preferences = usePreferences();
  const systems = useListCollection<System>("systems");
  const alerts = useListCollection<Alert>("alerts", {
    filter: "triggered=true",
    fields: "triggered",
  });

  return (
    <MenuBarExtra icon={Icon.Heartbeat} isLoading={alerts.isLoading || systems.isLoading} tooltip="Beszel Monitors">
      <MenuBarExtra.Item
        title={`${alerts.data.length} Alerts`}
        subtitle={`⋅ observation set to ${preferences.observationIntervalsCount}x${preferences.observationInterval}`}
      />
      <MenuBarExtra.Section title="Systems">
        {systems.data.map((system) => {
          return <SystemMenuBarItem key={system.id} system={system} />;
        })}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
