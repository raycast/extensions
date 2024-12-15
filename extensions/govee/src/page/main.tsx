import type { Device } from "@j3lte/govee-lan-controller";
import { useMemo } from "react";

import { List } from "@raycast/api";

import type { Scenario } from "@/types";

import useNameMapping from "@/hooks/useNameMapping";
import useScenarios from "@/hooks/useScenarios";

import ListItem from "@/components/DeviceListItem";
import ScenarioListItem from "@/components/ScenarioListItem";

export default function ControlGoveeLightsPage({
  devices,
  isLoading,
  executeScenario,
}: {
  devices: Device[];
  isLoading: boolean;
  executeScenario: ({ scenario }: { scenario: Scenario }) => Promise<void>;
}) {
  const { getName, setName } = useNameMapping();

  const scenariosHook = useScenarios();
  const { scenarios } = scenariosHook;

  const availableDeviceMappings = useMemo(() => {
    return devices.reduce(
      (acc, device) => {
        acc[device.id] = getName(device.id) ?? device.name;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [devices, getName]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for Govee lights...">
      <List.Section title="Scenarios">
        {scenarios.map((scenario) => (
          <ScenarioListItem
            key={scenario.id}
            scenario={scenario}
            scenariosHook={scenariosHook}
            availableDeviceNames={availableDeviceMappings}
            execute={() => executeScenario({ scenario })}
          />
        ))}
      </List.Section>
      <List.Section title="Devices">
        {devices.map((device) => (
          <ListItem
            key={device.id}
            device={device}
            displayName={getName(device.id)}
            setName={setName}
            scenariosHook={scenariosHook}
            availableDeviceNames={availableDeviceMappings}
          />
        ))}
      </List.Section>
    </List>
  );
}
