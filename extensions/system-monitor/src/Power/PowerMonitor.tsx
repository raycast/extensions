import { Color, List } from "@raycast/api";
import {
  getBatteryCondition,
  getBatteryLevel,
  getBatteryTime,
  getCycleCount,
  getIsCharging,
  getMaxBatteryCapacity,
  getTimeOnBattery,
} from "./PowerUtils";
import { useInterval } from "usehooks-ts";
import { Actions } from "../components/Actions";
import { usePromise } from "@raycast/utils";

export default function PowerMonitor() {
  const { revalidate, data: batteryLevel } = usePromise(getBatteryLevel);
  useInterval(revalidate, 1000);

  return (
    <List.Item
      id="power"
      title={`Power`}
      icon={{ source: "lightning.png", tintColor: Color.Yellow }}
      accessories={[{ text: batteryLevel ? `${batteryLevel}%` : "Loading…" }]}
      detail={<PowerMonitorDetail batteryLevel={batteryLevel || ""} />}
      actions={<Actions />}
    />
  );
}

function PowerMonitorDetail({ batteryLevel }: { batteryLevel: string }) {
  const {
    revalidate: revalidateIsCharging,
    data: isCharging,
    isLoading: isLoadingCharging,
  } = usePromise(getIsCharging);
  useInterval(revalidateIsCharging, 1000);

  const {
    revalidate: revalidateIsBatteryTime,
    data: batteryTime,
    isLoading: isLoadingBatteryTime,
  } = usePromise(getBatteryTime);
  useInterval(revalidateIsBatteryTime, 1000);

  const {
    revalidate: revalidateTimeOnBattery,
    data: timeOnBattery,
    isLoading: isLoadingTimeOnBattery,
  } = usePromise(getTimeOnBattery);
  useInterval(revalidateTimeOnBattery, 1000 * 60);

  const { data: cycleCount, isLoading: isLoadingCycleCount } = usePromise(getCycleCount);
  const { data: batteryCondition, isLoading: isLoadingBatteryCondition } = usePromise(getBatteryCondition);
  const { data: maxBatteryCapacity, isLoading: isLoadingMaxBatteryCapacity } = usePromise(getMaxBatteryCapacity);

  return (
    <List.Item.Detail
      isLoading={
        isLoadingCharging ||
        isLoadingBatteryTime ||
        isLoadingCycleCount ||
        isLoadingBatteryCondition ||
        isLoadingMaxBatteryCapacity ||
        isLoadingTimeOnBattery
      }
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Battery Level" text={batteryLevel + "%"} />
          <List.Item.Detail.Metadata.Label title="Charging" text={isCharging ? "Yes" : "No"} />
          <List.Item.Detail.Metadata.Label title="Cycle Count" text={cycleCount || "Loading…"} />
          <List.Item.Detail.Metadata.Label title="Condition" text={batteryCondition || "Loading…"} />
          <List.Item.Detail.Metadata.Label title="Maximum Battery Capacity" text={maxBatteryCapacity || "Loading…"} />
          <List.Item.Detail.Metadata.Label
            title={isCharging ? "Time to charge" : "Time to discharge"}
            text={batteryTime || "Loading…"}
          />
          <List.Item.Detail.Metadata.Label
            title={isCharging && batteryLevel === "100" ? "Time on AC" : "Time on battery"}
            text={timeOnBattery || "Loading…"}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
