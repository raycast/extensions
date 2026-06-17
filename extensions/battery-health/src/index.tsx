import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { execa } from "execa";
import plist from "plist";
import TimeRemainingItem from "./components/TimeRemainingItem";
import PercentageItem from "./components/PercentageItem";
import PowerUsageItem from "./components/PowerUsageItem";
import CycleCountItem from "./components/CycleCountItem";
import TemperatureItem from "./components/TemperatureItem";
import ChargeItem from "./components/ChargeItem";
import PowerSourceItem from "./components/PowerSourceItem";
import ConditionItem from "./components/ConditionItem";
import MaxCapacityItem from "./components/MaxCapacityItem";

type State = {
  batteryRegistry: any;
  batteryInfo: any;
  isLoading: boolean;
};

export default function Command() {
  const [state, setState] = useState<State>({
    batteryRegistry: {},
    batteryInfo: {},
    isLoading: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const { stdout } = await execa("/usr/sbin/ioreg", ["-arn", "AppleSmartBattery"]);
        const { stdout: battery } = await execa("/usr/sbin/system_profiler", ["SPPowerDataType", "-xml"]);
        const ioreg: any = plist.parse(stdout);
        const sysProfiler: any = plist.parse(battery);
        const batteryRegistry = ioreg[0];
        const batteryInfo = sysProfiler[0];

        setState((previous) => ({
          ...previous,
          batteryRegistry: batteryRegistry,
          batteryInfo: batteryInfo,
          isLoading: false,
        }));
      } catch (e) {
        setState((previous) => ({ ...previous, isLoading: false }));
      }
    })();
  }, []);

  return (
    <List isLoading={state.isLoading}>
      {!state.isLoading ? (
        <>
          <TimeRemainingItem timeRemaining={state.batteryRegistry["TimeRemaining"]} />
          <PercentageItem percentage={state.batteryRegistry["CurrentCapacity"]} />
          <PowerUsageItem voltage={state.batteryRegistry["Voltage"]} amperage={state.batteryRegistry["Amperage"]} />
          <ConditionItem pfStatus={state.batteryRegistry["PermanentFailureStatus"]} />
          <ChargeItem
            currentCapacity={
              state.batteryRegistry["AppleRawCurrentCapacity"] || state.batteryRegistry["CurrentCapacity"]
            }
            maxCapacity={state.batteryRegistry["AppleRawMaxCapacity"] || state.batteryRegistry["MaxCapacity"]}
          />
          <CycleCountItem cycles={state.batteryRegistry["CycleCount"]} />
          <MaxCapacityItem
            health={
              state.batteryInfo["_items"]?.[0]?.["sppower_battery_health_info"]?.[
                "sppower_battery_health_maximum_capacity"
              ]
            }
          />
          <PowerSourceItem
            externalConnected={state.batteryRegistry["ExternalConnected"]}
            adapter={state.batteryRegistry["AdapterDetails"]}
          />
          <TemperatureItem temperature={state.batteryRegistry["Temperature"]} />
        </>
      ) : null}
    </List>
  );
}
