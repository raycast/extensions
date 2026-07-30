import { getPreferenceValues, Icon, List } from "@raycast/api";
import { useInterval } from "usehooks-ts";
import { usePromise } from "@raycast/utils";

import { Actions } from "../components/Actions";
import { MetadataLabel, coloredAccessoryText } from "../components/MetadataLabel";
import { BatteryDataInterface } from "../Interfaces";
import { formatBatteryLevelDisplay } from "../lib/battery-level";
import { convertMinutesToHours } from "../utils";
import { getBatteryData, getTimeOnBattery, hasBattery } from "./PowerUtils";

const { displayModeBattery } = getPreferenceValues<ExtensionPreferences>();

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
      accessories={[
        {
          text: !data
            ? { value: isActive ? "Loading…" : "—", color: undefined }
            : !data.batteryPresent
              ? "AC Power"
              : !Number.isNaN(parseInt(data.batteryData?.batteryLevel ?? "", 10))
                ? coloredAccessoryText(
                    formatBatteryLevelDisplay(data.batteryData?.batteryLevel, displayModeBattery),
                    displayModeBattery === "free" ? "free" : "usage",
                  )
                : "N/A",
        },
      ]}
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
          {displayModeBattery === "free" ? (
            <MetadataLabel
              title="Battery Level"
              text={formatBatteryLevelDisplay(batteryData?.batteryLevel, "free").replace(" %", "%")}
              percentMode="free"
            />
          ) : (
            <MetadataLabel
              title="Battery Level (Used)"
              text={formatBatteryLevelDisplay(batteryData?.batteryLevel, "used").replace(" %", "%")}
              percentMode="usage"
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
