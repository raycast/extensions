import type { ColorInput, Device } from "@j3lte/govee-lan-controller";
import { Govee, GoveeEventTypes } from "@j3lte/govee-lan-controller";
import PQueue from "p-queue";
import { useCallback, useEffect, useRef, useState } from "react";

import { getPreferenceValues } from "@raycast/api";

import type { GoveeControllerReturn, Scenario } from "@/types";

import { wait } from "@/utils";

const WAIT = 100;

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
          // console.log("Adding device", device.id);
          return [...prev, device];
        }
        // console.log("Removing device", device.id);
        return prev.filter((device) => device.id !== device.id);
      });
    },
    [devices, setDevices],
  );

  const executeScenario = useCallback(async ({ scenario }: { scenario: Scenario }) => {
    const controller = govee.current;
    if (!controller) {
      throw new Error("Govee controller not ready");
    }

    const devices = await Promise.all(
      scenario.devices.map(({ id, scenario }) => controller.getDevice(id).then((d) => ({ dev: d, scenario }))),
    );
    const all = scenario.all;

    // This is a queue that will run the commands in order
    const queue = new PQueue({ concurrency: 1 });

    // let count = 0;
    // queue.on("active", () => {
    //   console.log(`Working on item #${++count}.  Size: ${queue.size}  Pending: ${queue.pending}`);
    // });

    // queue.on("next", (e) => {
    //   console.log("Next task started", e);
    // });

    if (all) {
      devices.forEach(async ({ dev, scenario }) => {
        if (all.onOff !== null && (!scenario || scenario?.onOff === null)) {
          if (all.onOff) {
            await queue.add(() => dev.turnOn());
            await queue.add(() => wait(WAIT));
          } else {
            await queue.add(() => dev.turnOff());
            await queue.add(() => wait(WAIT));
          }
        }
        if (all.brightness !== null && (!scenario || scenario?.brightness === null)) {
          await queue.add(() => dev.setBrightness(all.brightness as number));
          await queue.add(() => wait(WAIT));
        }
        if (all.color !== null && (!scenario || scenario?.color === null)) {
          await queue.add(() => dev.setColor(all.color as ColorInput));
          await queue.add(() => wait(WAIT));
        }
      });
    }

    devices.forEach(async ({ dev, scenario }) => {
      if (scenario) {
        if (scenario.onOff !== null) {
          await queue.add(() => (scenario.onOff ? dev.turnOn() : dev.turnOff()));
          await queue.add(() => wait(WAIT));
        }
        if (scenario.brightness !== null) {
          await queue.add(() => dev.setBrightness(scenario.brightness as number));
          await queue.add(() => wait(WAIT));
        }
        if (scenario.color !== null) {
          await queue.add(() => dev.setColor(scenario.color as ColorInput));
          await queue.add(() => wait(WAIT));
        }
      }
    });
  }, []);

  useEffect(() => {
    const initAndReady = async () => {
      const controller = new Govee({
        discoverInterval: 10000,
        deviceUpdateInterval: 2000,
      });

      controller.on(GoveeEventTypes.NewDevice, (device) => {
        // console.log("New device found", device.id);
        updateDevices({ device, op: "add" });
      });

      controller.on(GoveeEventTypes.Error, (err) => {
        const error = err instanceof Error ? err : new Error("Unknown error");
        // console.error("Error with Govee controller", error);
        setError(error);
      });

      controller.on(GoveeEventTypes.UnknownMessage, (msg) => {
        console.warn("Unknown message", msg);
      });

      controller.on(GoveeEventTypes.UnknownMessage, (msg) => {
        console.warn("Unknown message", msg);
      });

      // race who's first (device discovery or timeout)
      let canError = true;
      await Promise.race([
        wait(DISCOVERY_TIMEOUT).then(() => {
          if (canError) {
            setError(new Error("Error initializing Govee Controller: timeout"));
          }
        }),
        controller.waitForReady().then(() => {
          canError = false;
        }),
      ]);
      canError = false;
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
  };
};

export default useGoveeController;
