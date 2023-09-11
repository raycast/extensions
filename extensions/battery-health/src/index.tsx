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

type State = {
  batteryRegistry: any;
  isLoading: boolean;
};

export default function Command() {
  const [state, setState] = useState<State>({
    batteryRegistry: {},
    isLoading: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const { stdout } = await execa("/usr/sbin/ioreg", ["-arn", "AppleSmartBattery"]);
        const ioreg: any = plist.parse(stdout);
        const batteryRegistry = ioreg[0];

        setState((previous) => ({ ...previous, batteryRegistry: batteryRegistry, isLoading: false }));
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
