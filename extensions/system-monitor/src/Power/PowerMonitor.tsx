import { Color, Icon, List, showToast, Toast } from "@raycast/api";
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
import { useInterval } from "usehooks-ts";
import { PowerMointorState } from "../Interfaces";

const PowerMonitor = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [state, setState] = useState<PowerMointorState>({
    batteryLevel: "Loading...",
    isCharging: false,
    cycleCount: "Loading...",
    batteryCondition: "Loading...",
    maxBatteryCapacity: "Loading...",
    batteryTime: "Calculating...",
  });
  useInterval(async () => {
    try {
      const tempState = {
        batteryLevel: await getBatteryLevel(),
        isCharging: await getIsCharging(),
        batteryTime: await getBatteryTime(),
      };
      setState((prevState) => {
        return {
          ...prevState,
          ...tempState,
        };
      });
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, 1000);
  useEffect(() => {
    const updatePowerInfo = async () => {
      const permState = {
        cycleCount: await getCycleCount(),
        batteryCondition: await getBatteryCondition(),
        maxBatteryCapacity: await getMaxBatteryCapacity(),
      };
      setState((prevState) => {
        return {
          ...prevState,
          ...permState,
        };
      });
    };
    updatePowerInfo();
  }, []);
  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Couldn't fetch Power Info",
        message: error.message,
      });
    }
  }, [error]);
  return (
    <List.Item
      title={`Power`}
      icon={{ source: "lightning.png", tintColor: Color.PrimaryText }}
      accessoryTitle={isLoading ? "Loading..." : `${state.batteryLevel}%`}
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
  );
};
export default PowerMonitor;
