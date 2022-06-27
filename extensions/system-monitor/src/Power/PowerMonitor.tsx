import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getBatteryCondition,
  getBatteryLevel,
  getBatteryTime,
  getCycleCount,
  getIsCharging,
  getMaxBatteryCapacity,
  isValidTime,
} from "./PowerUtils";

const PowerMonitor = () => {
  const [state, setState] = useState({
    batteryLevel: "Checking...",
    isCharging: false,
    cycleCount: "Checking...",
    batteryCondition: "Checking...",
    maxBatteryCapacity: "Checking...",
    batteryTime: "Calculating...",
  });
  useEffect(() => {
    //checking for charging
    const updatePowerData = async () => {
      try {
        const newState = {
          batteryLevel: await getBatteryLevel(),
          cycleCount: await getCycleCount(),
          isCharging: await getIsCharging(),
          batteryCondition: await getBatteryCondition(),
          maxBatteryCapacity: await getMaxBatteryCapacity(),
          batteryTime: await getBatteryTime(),
        };
        setState(newState);
      } catch (err) {
        console.log(err);
      }
    };
    updatePowerData();
  }, []);
  return (
    <>
      <List.Item
        title={`🔋 Power : `}
        subtitle={`${state.batteryLevel}%`}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Battery Level" text={state.batteryLevel + "%"} />
                <List.Item.Detail.Metadata.Label title="Charging" text={state.isCharging ? "Yes" : "No"} />
                <List.Item.Detail.Metadata.Label title="Cycle Count" text={state.cycleCount} />
                <List.Item.Detail.Metadata.Label title="Condition" text={state.batteryCondition} />
                <List.Item.Detail.Metadata.Label title="Maximum Battery Capacity" text={state.maxBatteryCapacity} />
                <List.Item.Detail.Metadata.Label
                  title={state.isCharging ? "Time to charge" : "Time to discharge"}
                  text={isValidTime(state.batteryTime) ? state.batteryTime : "Calculating..."}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
      />
    </>
  );
};
export default PowerMonitor;
