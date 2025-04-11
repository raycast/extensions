import type { Device } from "@j3lte/govee-lan-controller";
import { Govee, GoveeEventTypes } from "@j3lte/govee-lan-controller";
import { useCallback, useEffect, useRef, useState } from "react";

import { getPreferenceValues } from "@raycast/api";

import type { GoveeControllerReturn, Scenario } from "@/types";

import { execScenario, wait } from "@/utils";

const { deviceDiscoveryTimeout } = getPreferenceValues<Preferences>();
const DISCOVERY_TIMEOUT_VALUE = deviceDiscoveryTimeout ? parseInt(deviceDiscoveryTimeout) : 5000;
const DISCOVERY_TIMEOUT = Number.isNaN(DISCOVERY_TIMEOUT_VALUE)
  ? 5000
  : DISCOVERY_TIMEOUT_VALUE < 1000
    ? 1000
    : DISCOVERY_TIMEOUT_VALUE;

const useGoveeController = (): GoveeControllerReturn => {
  const govee = useRef<Govee | null>(null);

  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const updateDevices = useCallback(
    ({ device, op }: { device: Device; op: "add" | "remove" }) => {
      setDevices((prev) => {
        if (op === "add") {
          return [...prev, device];
        }
        return prev.filter((device) => device.id !== device.id);
      });
    },
    [devices, setDevices],
  );

  const executeScenario = useCallback(
    async ({ scenario }: { scenario: Scenario }) => {
      const controller = govee.current;
      if (!controller) {
        throw new Error("Govee controller not ready");
      }

      return execScenario(scenario, controller, devices);
    },
    [devices],
  );

  useEffect(() => {
    const initAndReady = async () => {
      const controller = new Govee({
        discoverInterval: 10000,
        deviceUpdateInterval: 2000,
      });

      controller.on(GoveeEventTypes.NewDevice, (device) => {
        updateDevices({ device, op: "add" });
      });

      controller.on(GoveeEventTypes.Error, (err) => {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
      });

      controller.on(GoveeEventTypes.UnknownMessage, (msg) => {
        console.warn("Unknown message", msg);
      });

      const abortController = new AbortController();
      const { signal } = abortController;

      try {
        await Promise.race([
          controller.waitForReady().then(() => {
            abortController.abort(); // Abort the timeout if controller is ready
          }),
          wait(DISCOVERY_TIMEOUT, signal),
        ]);
      } catch (error: unknown) {
        if (error instanceof Error && error?.message !== "Aborted") {
          setError(new Error("Error initializing Govee Controller: timeout"));
        }
      }

      setIsLoading(false);

      govee.current = controller;
    };

    initAndReady();

    return () => {
      govee.current?.destroy();
    };
  }, []);

  return {
    devices: devices.sort((a, b) => a.name.localeCompare(b.name)),
    executeScenario,
    isLoading,
    error,
    controller: govee.current,
  };
};

export default useGoveeController;
