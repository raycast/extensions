import plist from "plist";
import { execp } from ".";

export const getBatteryState = async () => {
  const ioregOutput = await (await execp("/usr/sbin/ioreg -arn AppleSmartBattery")).stdout.trim();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [batt] = plist.parse(ioregOutput) as any;

  const voltage = batt.Voltage;
  const amperage = batt.Amperage;
  const connected = batt.ExternalConnected;
  const validPowerDirection = connected ? amperage > 0 : amperage < 0;
  const timeRemaining = validPowerDirection && batt.TimeRemaining < 65535 ? batt.TimeRemaining : null;
  const capacity = batt.CurrentCapacity / 100;
  // if there's no time remaining, then probably we switched from battery to AC power
  const watts = timeRemaining != null && voltage && amperage ? (voltage / 1000) * (amperage / 1000) : null;
  const temperature = batt.Temperature;

  const state = {
    time: Date.now(),
    capacity,
    voltage,
    amperage,
    watts,
    timeRemaining: timeRemaining,
    hoursRemaining: timeRemaining != null ? Math.floor(timeRemaining / 60) : null,
    minutesRemaining: timeRemaining != null ? timeRemaining % 60 : null,
    temperature,
    connected,
    charging: connected,
  };
  return state;
};
export type BatteryState = Awaited<ReturnType<typeof getBatteryState>>;
