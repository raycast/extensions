import { useEffect, useMemo } from "react";

import { List, Toast, showToast } from "@raycast/api";

import useGoveeController from "@/hooks/useGoveeController";
import useNameMapping from "@/hooks/useNameMapping";
import useScenarios from "@/hooks/useScenarios";

import ListItem from "@/components/DeviceListItem";
import ScenarioListItem from "@/components/ScenarioListItem";

export default function ControlGoveeLights() {
  const { devices, isLoading: isLoadingController, error, executeScenario } = useGoveeController();
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

  useEffect(() => {
    if (error && error.name !== "SyntaxError") {
      console.error("Error with Govee controller", error);
      showToast({
        title: "Error",
        message: error.message,
        style: Toast.Style.Failure,
      });
    }
  }, [error]);

  return (
    <List isLoading={isLoadingController} searchBarPlaceholder="Search for Govee lights...">
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
