import type { Device, Govee } from "@j3lte/govee-lan-controller";
import { useEffect, useState } from "react";

import { Detail, Toast, popToRoot, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import useScenarios from "@/hooks/useScenarios";

import { execScenario } from "@/utils";

export default function Execute({
  id,
  isLoading,
  controller,
  devices,
}: {
  id: string;
  isLoading: boolean;
  controller: Govee | null;
  devices: Device[];
}) {
  const [executed, setExecuted] = useState(false);
  const { scenarios, isLoading: isLoadingScenarios } = useScenarios();
  const scenario = scenarios.find((scenario) => scenario.id === id);
  const allDevicesPresent = scenario?.devices.every(({ id }) => devices.some((device) => device.id === id));

  useEffect(() => {
    if (!isLoadingScenarios && !scenario) {
      showFailureToast("Scenario not found");
      popToRoot();
    }
  }, [isLoadingScenarios, scenario]);

  useEffect(() => {
    const execute = async () => {
      if (!controller || !scenario) {
        return;
      }
      await controller.waitForReady();
      await Promise.all(devices.map((d) => d.waitForFirstUpdate()));
      try {
        await execScenario(scenario, controller, devices);
        showToast({
          title: "Scenario executed successfully",
          style: Toast.Style.Success,
        });
        popToRoot();
      } catch (error) {
        showFailureToast(error);
        popToRoot();
      }
    };
    if (scenario && !isLoading && allDevicesPresent && !executed && controller) {
      setExecuted(true);
      execute();
    }
  }, [scenario, isLoading, allDevicesPresent, executed, controller]);

  return <Detail isLoading markdown={`Executing scenario: ${scenario?.title}`} />;
}
