import { List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { execa } from "execa";
import plist from "plist";
import TimeRemainingItem from "./components/TimeRemainingItem";
import PowerUsageItem from "./components/PowerUsageItem";
import CycleCountItem from "./components/CycleCountItem";
import TemperatureItem from "./components/TemperatureItem";
import ChargeItem from "./components/ChargeItem";
import PowerSourceItem from "./components/PowerSourceItem";
import ConditionItem from "./components/ConditionItem";
import StatsListItem from "./components/StatsListItem";

type State = {
  batteryRegistry: any;
  isLoading: boolean;
};

type TValues = Record<"health" | "percentage", string>;
const EMPTY_PLACEHOLDER = "--";
const DEFAULT_VALUES: TValues = {
  health: EMPTY_PLACEHOLDER,
  percentage: EMPTY_PLACEHOLDER,
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

  const { health, percentage } = useMemo(() => {
    const values: TValues = DEFAULT_VALUES;
    if (state?.batteryRegistry && !state.isLoading) {
      const { AppleRawMaxCapacity, DesignCapacity, CurrentCapacity } = state.batteryRegistry;
      if (!isNaN(AppleRawMaxCapacity / DesignCapacity)) {
        values["health"] = ((AppleRawMaxCapacity / DesignCapacity) * 100).toFixed(1) + "%";
      }
      if (CurrentCapacity !== undefined && CurrentCapacity <= 100) values["percentage"] = `${CurrentCapacity}%`;
    }

    return DEFAULT_VALUES;
  }, [state.isLoading, state?.batteryRegistry]);

  return (
    <List isLoading={state.isLoading}>
      {!state.isLoading ? (
        <>
          <TimeRemainingItem timeRemaining={state.batteryRegistry["TimeRemaining"]} />
          <StatsListItem label="Percentage" value={percentage} />
          <PowerUsageItem voltage={state.batteryRegistry["Voltage"]} amperage={state.batteryRegistry["Amperage"]} />
          <ConditionItem pfStatus={state.batteryRegistry["PermanentFailureStatus"]} />
          <ChargeItem
            currentCapacity={
              state.batteryRegistry["AppleRawCurrentCapacity"] || state.batteryRegistry["CurrentCapacity"]
            }
            maxCapacity={state.batteryRegistry["AppleRawMaxCapacity"] || state.batteryRegistry["MaxCapacity"]}
          />
          <StatsListItem label="Health" value={health} />
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
