import plist, { PlistArray, PlistObject } from "plist";
import { BatteryDataInterface } from "../Interfaces";
import { convertMsToTime, execp } from "../utils";

export const getBatteryData = async (): Promise<BatteryDataInterface> => {
  const smartBatteryOutput = await execp("/usr/sbin/ioreg -arn AppleSmartBattery");
  const systemProfilerOutput = await execp(
    `/usr/sbin/system_profiler SPPowerDataType | /usr/bin/grep -e 'Condition' -e 'Maximum Capacity'| /usr/bin/awk '{print $NF}'`,
  );
  const smartBattery = (plist.parse(smartBatteryOutput) as PlistArray)[0] as PlistObject;
  const [condition, maximumCapacity] = systemProfilerOutput.split("\n");
  const batteryLevel = await execp("/usr/bin/pmset -g batt | /usr/bin/grep -Eo '\\d+%' | /usr/bin/tr -d '%'");

  return {
    batteryLevel,
    condition,
    cycleCount: smartBattery.CycleCount.toString(),
    fullyCharged: !!smartBattery.FullyCharged,
    isCharging: !!smartBattery.IsCharging,
    temperature: `${Math.fround((smartBattery.Temperature as number) / 100).toFixed(2)} ºC`,
    timeRemaining: smartBattery.TimeRemaining as number,
    maximumCapacity,
  };
};

export const getTimeOnBattery = async (): Promise<string> => {
  const lastChargeDate = await execp(
    '/usr/bin/pmset -g log | grep "Using AC" | tail -n 1 | awk \'{print $1 " " $2 " " $3}\'',
  );
  const startTime = new Date(Date.parse(lastChargeDate));
  const endTime = new Date();

  return convertMsToTime(endTime.valueOf() - startTime.valueOf());
};

export const hasBattery = async (): Promise<boolean> => {
  const output = await execp("/usr/sbin/ioreg -arn AppleSmartBattery");

  return !!output;
};
