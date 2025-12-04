import type { ColorInput, Device, Govee } from "@j3lte/govee-lan-controller";
import PQueue from "p-queue";

import type { Scenario, ScenarioInput } from "@/types";

export async function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new Error("Aborted"));
    });
  });
}

export const execScenario = async (scenario: Scenario, controller: Govee, devices: Device[], WAIT = 100) => {
  const localDevices = scenario.devices
    .map(({ id, scenario }) => {
      const dev = devices.find((d) => d.id === id);
      return { dev, scenario };
    })
    .filter(({ dev }) => dev) as { dev: Device; scenario: ScenarioInput | null }[];

  if (localDevices.length === 0) {
    return;
  }

  const all = scenario.all;

  // This is a queue that will run the commands in order
  const queue = new PQueue({ concurrency: 1, autoStart: false, timeout: 5000 });

  if (all) {
    localDevices.forEach(async ({ dev, scenario }) => {
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

  localDevices.forEach(async ({ dev, scenario }) => {
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

  queue.start();

  return queue.onIdle();
};
