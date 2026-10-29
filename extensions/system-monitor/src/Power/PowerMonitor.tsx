import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useInterval } from "usehooks-ts";
import { usePromise } from "@raycast/utils";

import { Actions } from "../components/Actions";
import { pendingText, percentTagAccessory, UsageTag } from "../components/CompactMetadata";
import { MetadataLabel } from "../components/MetadataLabel";
import { BatteryDataInterface } from "../Interfaces";
import { batteryDisplayPercent } from "../lib/battery-level";
import { convertMinutesToHours } from "../utils";
import { getBatteryData, getTimeOnBattery, hasBattery } from "./PowerUtils";

const { displayModeBattery } = getPreferenceValues<ExtensionPreferences>();
const batteryPercentMode = displayModeBattery === "free" ? "free" : "usage";

function batteryAccessory(
  data: { batteryPresent: boolean; batteryData?: BatteryDataInterface } | undefined,
  isActive: boolean,
): List.Item.Accessory {
  if (!data) {
    return { text: pendingText(isActive) };
  }

  if (!data.batteryPresent) {
    return { text: "AC Power" };
  }

  const percent = batteryDisplayPercent(
    data.batteryData?.batteryLevel,
    batteryPercentMode === "free" ? "free" : "used",
  );
  return percent === null ? { text: "N/A" } : percentTagAccessory(percent, batteryPercentMode);
}

export default function PowerMonitor({ isActive = false }: { isActive?: boolean }) {
  const { revalidate, data } = usePromise(
    async () => {
      const batteryPresent = await hasBattery();
      if (!batteryPresent) {
        return {
          batteryPresent: false,
          batteryData: undefined,
          isOnAC: true,
        };
      }

      const batteryData = await getBatteryData();

      return {
        batteryPresent: true,
        batteryData,
        isOnAC: batteryData.isOnAcPower,
      };
    },
    [],
    { execute: true },
  );

  useInterval(() => {
    if (isActive) {
      revalidate();
    }
  }, 1000);

  return (
    <List.Item
      id="power"
      title="Power"
      icon={Icon.Plug}
      accessories={[batteryAccessory(data, isActive)]}
      detail={
        !data ? (
          <List.Item.Detail isLoading />
        ) : (
          <PowerMonitorDetail
            batteryPresent={data.batteryPresent}
            batteryData={data.batteryData}
            isOnAC={data.isOnAC}
            isActive={isActive}
          />
        )
      }
      actions={<Actions radioButtonNumber={3} />}
    />
  );
}

function PowerMonitorDetail({
  batteryPresent,
  batteryData,
  isOnAC,
  isActive,
}: {
  batteryPresent: boolean;
  batteryData?: BatteryDataInterface;
  isOnAC?: boolean;
  isActive: boolean;
}) {
  const {
    revalidate,
    data: timeOnBattery,
    isLoading: isLoadingTimeOnBattery,
  } = usePromise(getTimeOnBattery, [], {
    execute: isActive && batteryPresent,
  });

  useInterval(() => {
    if (isActive && batteryPresent) {
      revalidate();
    }
  }, 1000 * 60);

  const batteryPercent = batteryDisplayPercent(
    batteryData?.batteryLevel,
    batteryPercentMode === "free" ? "free" : "used",
  );

  if (!batteryPresent) {
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <MetadataLabel title="Power Source" text="AC Power" />
            <MetadataLabel title="Battery" text="Not available on this Mac" />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  return (
    <List.Item.Detail
      isLoading={!batteryData || (isLoadingTimeOnBattery && !timeOnBattery)}
      metadata={
        <List.Item.Detail.Metadata>
          <MetadataLabel title="Power Source" text={isOnAC ? "AC Power" : "Battery"} />
          {batteryPercent === null ? (
            <MetadataLabel title="Battery Level" text="N/A" />
          ) : (
            <UsageTag
              title={batteryPercentMode === "free" ? "Battery Level" : "Battery Level (Used)"}
              percent={batteryPercent}
              displayMode={batteryPercentMode}
            />
          )}
          <MetadataLabel title="Charging" text={batteryData?.isCharging ? "Yes" : "No"} />
          <MetadataLabel title="Cycle Count" text={batteryData?.cycleCount || "N/A"} />
          <MetadataLabel title="Battery Condition" text={batteryData?.condition || "N/A"} />
          {batteryData?.temperature && batteryData.temperature !== "N/A" ? (
            <MetadataLabel title="Battery Temperature" text={batteryData.temperature} />
          ) : null}
          <MetadataLabel title="Maximum Battery Capacity" text={batteryData?.maximumCapacity || "N/A"} />
          {!isOnAC ? (
            <>
              <MetadataLabel
                title={batteryData?.isCharging ? "Time to charge" : "Time to discharge"}
                text={batteryData ? convertMinutesToHours(batteryData.timeRemaining) : "N/A"}
              />
              <MetadataLabel title="Time on battery" text={timeOnBattery || "N/A"} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
