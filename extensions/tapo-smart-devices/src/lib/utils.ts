import { isAvailableDevice } from "./devices";
import { AvailableDevice, Device } from "./types";

export const normaliseMacAddress = (macAddress: string): string => macAddress.replace(/:/g, "").toUpperCase();

export const isWindows = process.platform === "win32";

type SplitResult = [AvailableDevice[], Device[]];

export const split = (items: Device[], splitFn: typeof isAvailableDevice): SplitResult => {
  return items.reduce(
    (accumulator, element) => {
      const [truthyItems, falseyItems] = accumulator;

      if (splitFn(element)) {
        truthyItems.push(element);
      } else {
        falseyItems.push(element);
      }

      return accumulator;
    },
    [[], []] as [AvailableDevice[], Device[]],
  );
};
