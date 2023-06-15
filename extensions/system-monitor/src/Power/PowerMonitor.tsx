import { Color, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getBatteryCondition,
  getBatteryLevel,
  getBatteryTime,
  getCycleCount,
  getIsCharging,
  getMaxBatteryCapacity,
  isValidTime,
  getTimeOnBattery,
} from "./PowerUtils";
import { useInterval } from "usehooks-ts";
import { ExecError, PowerMonitorState } from "../Interfaces";
import { Actions } from "../components/Actions";

const PowerMonitor = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ExecError>();
  const [state, setState] = useState<PowerMonitorState>({
    batteryLevel: "Loading...",
    isCharging: false,
    cycleCount: "Loading...",
    batteryCondition: "Loading...",
    maxBatteryCapacity: "Loading...",
    batteryTime: "Calculating...",
    timeOnBattery: "Calculating...",
  });

  useInterval(async () => {
    getBatteryLevel()
      .then((newBatteryLevel) => {
        getIsCharging()
          .then((newIsCharging) => {
            getBatteryTime()
              .then((newBatteryTime) => {
                getTimeOnBattery()
                  .then((timeOnBattery) => {
                    setState((prevState) => {
                      return {
                        ...prevState,
                        batteryLevel: newBatteryLevel,
                        isCharging: newIsCharging,
                        batteryTime: newBatteryTime,
                        timeOnBattery: timeOnBattery,
                      };
                    });
                    setIsLoading(false);
                  })
                  .catch((error: ExecError) => {
                    setError(error);
                  });
              })
              .catch((error: ExecError) => {
                setError(error);
              });
          })
          .catch((error: ExecError) => {
            setError(error);
          });
      })
      .catch((error: ExecError) => {
        setError(error);
      });
  }, 1000);

  useEffect(() => {
    getCycleCount()
      .then((newCycleCount) => {
        getBatteryCondition()
          .then((newBatteryCondition) => {
            getMaxBatteryCapacity()
              .then((newMaxBatteryCapacity) => {
                setState((prevState) => {
                  return {
                    ...prevState,
                    cycleCount: newCycleCount,
                    batteryCondition: newBatteryCondition,
                    maxBatteryCapacity: newMaxBatteryCapacity,
                  };
                });
              })
              .catch((error: ExecError) => {
                setError(error);
              });
          })
          .catch((error: ExecError) => {
            setError(error);
          });
      })
      .catch((error: ExecError) => {
        setError(error);
      });
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: `Couldn't fetch Power Info [Error Code: ${error.code}]`,
        message: error.stderr,
      });
    }
  }, [error]);

  return (
    <List.Item
      title={`Power`}
      icon={{ source: "lightning.png", tintColor: Color.Yellow }}
      accessories={[{ text: isLoading ? "Loading..." : `${state.batteryLevel}%` }]}
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
              <List.Item.Detail.Metadata.Label
                title={state.isCharging ? "Time on AC" : "Time on battery"}
                text={state.timeOnBattery}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<Actions />}
    />
  );
};
export default PowerMonitor;
