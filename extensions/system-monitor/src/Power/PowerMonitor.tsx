import { Icon, List } from "@raycast/api";
import { useInterval } from "usehooks-ts";
import { usePromise } from "@raycast/utils";

import { Actions } from "../components/Actions";
import { BatteryDataInterface } from "../Interfaces";
import { convertMinutesToHours } from "../utils";
import { getBatteryData, getTimeOnBattery } from "./PowerUtils";

export default function PowerMonitor() {
  const { revalidate, data } = usePromise(async () => {
    const batteryData = await getBatteryData();
    const isOnAC = !batteryData.isCharging && batteryData.fullyCharged;

    return {
      batteryData,
      isOnAC,
    };
  });

  useInterval(revalidate, 1000);

  return (
    <List.Item
      id="power"
      title="Power"
      icon={Icon.Plug}
      accessories={[{ text: data?.batteryData ? `${data?.batteryData?.batteryLevel} %` : "Loading…" }]}
      detail={<PowerMonitorDetail batteryData={data?.batteryData} isOnAC={data?.isOnAC} />}
      actions={<Actions radioButtonNumber={3} />}
    />
  );
}

function PowerMonitorDetail({ batteryData, isOnAC }: { batteryData?: BatteryDataInterface; isOnAC?: boolean }) {
  const { revalidate, data: timeOnBattery, isLoading: isLoadingTimeOnBattery } = usePromise(getTimeOnBattery);

  useInterval(revalidate, 1000 * 60);

  return (
    <List.Item.Detail
      isLoading={!!batteryData || isLoadingTimeOnBattery}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Battery Level" text={`${batteryData?.batteryLevel}%`} />
          <List.Item.Detail.Metadata.Label title="Charging" text={batteryData?.isCharging ? "Yes" : "No"} />
          <List.Item.Detail.Metadata.Label title="Cycle Count" text={batteryData?.cycleCount || "Loading…"} />
          <List.Item.Detail.Metadata.Label title="Battery Condition" text={batteryData?.condition || "Loading…"} />
          <List.Item.Detail.Metadata.Label title="Battery Temperature" text={batteryData?.temperature || "Loading…"} />
          <List.Item.Detail.Metadata.Label
            title="Maximum Battery Capacity"
            text={batteryData?.maximumCapacity || "Loading…"}
          />
          {!isOnAC ? (
            <>
              <List.Item.Detail.Metadata.Label
                title={batteryData?.isCharging ? "Time to charge" : "Time to discharge"}
                text={batteryData ? convertMinutesToHours(batteryData?.timeRemaining) : "Loading…"}
              />
              <List.Item.Detail.Metadata.Label title="Time on battery" text={timeOnBattery || "Loading…"} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
