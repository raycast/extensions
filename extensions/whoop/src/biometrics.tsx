import React from "react";
import { Color, List, Toast, showToast } from "@raycast/api";
import { getProgressIcon, useCachedPromise } from "@raycast/utils";
import { getCycleCollection, getRecoveryCollection, getSleepCollection } from "./api/client";
import { View } from "./components/View";
import {
  Cycle,
  PaginatedCycleResponse,
  PaginatedRecoveryResponse,
  PaginatedSleepResponse,
  Recovery,
  Sleep,
} from "./helpers/whoop.api";
import { calcCals, formatDate, formatMillis, formatStrain } from "./helpers/formats";
import { getRecoveryColor } from "./helpers/recovery";
import { WhoopColor } from "./helpers/constants";

function CycleListItem({
  cycle,
  recovery,
  sleep,
  isLoading,
}: {
  cycle: Cycle;
  recovery?: Recovery;
  sleep?: Sleep;
  isLoading: boolean;
}) {
  // CYCLE STUFF
  const strain = formatStrain(cycle.score?.strain);
  const kilojoule = cycle.score?.kilojoule;
  const kilocalories = calcCals(kilojoule);

  // SLEEP STUFF
  const isNap = sleep?.nap;

  const totalInBedTimeMilli = sleep?.score?.stage_summary?.total_in_bed_time_milli || 0;
  const totalAwakeTimeMilli = sleep?.score?.stage_summary?.total_awake_time_milli || 0;
  const totalLightSleepTimeMilli = sleep?.score?.stage_summary?.total_light_sleep_time_milli || 0;
  const totalSlowWaveSleepTimeMilli = sleep?.score?.stage_summary?.total_slow_wave_sleep_time_milli || 0;
  const totalRemSleepTimeMilli = sleep?.score?.stage_summary?.total_rem_sleep_time_milli || 0;
  const disturbanceCount = sleep?.score?.stage_summary?.disturbance_count || 0;

  const sleepNeededBaselineMilli = sleep?.score?.sleep_needed?.baseline_milli || 0;
  const needFromSleepDebtMilli = sleep?.score?.sleep_needed?.need_from_sleep_debt_milli || 0;
  const needFromRecentStrainMilli = sleep?.score?.sleep_needed?.need_from_recent_strain_milli || 0;
  const needFromRecentNapMilli = sleep?.score?.sleep_needed?.need_from_recent_nap_milli || 0;

  const sleepPerformancePercentage = sleep?.score?.sleep_performance_percentage || 0;

  const respiratoryRate = parseFloat((sleep?.score?.respiratory_rate || 0).toFixed(1));
  const wakeEvents = parseFloat((disturbanceCount / (totalInBedTimeMilli / 3600000)).toFixed(1));

  // RECOVERY STUFF
  const recoveryScore = recovery?.score?.recovery_score || 0;
  const restingHeartRate = recovery?.score?.resting_heart_rate || 0;
  const hrvRmssdMili = recovery?.score?.hrv_rmssd_milli || 0;

  function getStagePercentage(stageMilli: number) {
    return `${Math.round((stageMilli / totalInBedTimeMilli) * 100)}%`;
  }

  function getSleepText(stageMilli: number) {
    return `${getStagePercentage(stageMilli)}  ·  ${formatMillis(stageMilli)}`;
  }

  return (
    <List.Item
      title={formatDate(cycle.created_at, "MMM d", true) || "n/a"}
      accessories={[
        { icon: getProgressIcon(recoveryScore / 100, getRecoveryColor(recoveryScore)) },
        { icon: getProgressIcon(strain / 21, WhoopColor.strain) },
      ]}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Overview"
                text={`${formatDate(cycle.start, "HH:mm")} -> ${cycle.end ? formatDate(cycle.end, "HH:mm") : "Now"}`}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Recovery">
                <List.Item.Detail.Metadata.TagList.Item
                  text={`${Math.round(recoveryScore)}%`}
                  color={getRecoveryColor(recoveryScore)}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Strain">
                <List.Item.Detail.Metadata.TagList.Item text={`${strain}`} color={WhoopColor.strain} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Calories">
                <List.Item.Detail.Metadata.TagList.Item
                  text={`${Math.round(kilocalories)} Cal`}
                  color={Color.SecondaryText}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="RHR">
                <List.Item.Detail.Metadata.TagList.Item
                  text={`${Math.round(restingHeartRate)} bpm`}
                  color={Color.SecondaryText}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="HRV">
                <List.Item.Detail.Metadata.TagList.Item
                  text={`${Math.round(hrvRmssdMili)}`}
                  color={Color.SecondaryText}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title=" " />
              <List.Item.Detail.Metadata.Label
                title={`${isNap ? "Nap" : "Sleep"}`}
                text={`${formatDate(sleep?.start || "", "HH:ss")} -> ${formatDate(sleep?.end || "", "HH:ss")}`}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Performance">
                <List.Item.Detail.Metadata.TagList.Item
                  text={`${Math.round(sleepPerformancePercentage)}%`}
                  color={Color.SecondaryText}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Sleep Duration">
                <List.Item.Detail.Metadata.TagList.Item
                  text={formatMillis(totalInBedTimeMilli - totalAwakeTimeMilli)}
                  color={WhoopColor.sleep}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Sleep Needed">
                <List.Item.Detail.Metadata.TagList.Item
                  text={formatMillis(
                    sleepNeededBaselineMilli +
                      needFromSleepDebtMilli +
                      needFromRecentStrainMilli +
                      needFromRecentNapMilli,
                  )}
                  color={WhoopColor.teal}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Awake">
                <List.Item.Detail.Metadata.TagList.Item
                  text={getSleepText(totalAwakeTimeMilli)}
                  color={Color.SecondaryText}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Light">
                <List.Item.Detail.Metadata.TagList.Item
                  text={getSleepText(totalLightSleepTimeMilli)}
                  color={WhoopColor.lightSleep}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Deep">
                <List.Item.Detail.Metadata.TagList.Item
                  text={getSleepText(totalSlowWaveSleepTimeMilli)}
                  color={WhoopColor.deepSleep}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="REM">
                <List.Item.Detail.Metadata.TagList.Item
                  text={getSleepText(totalRemSleepTimeMilli)}
                  color={WhoopColor.remSleep}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Time in Bed" text={formatMillis(totalInBedTimeMilli)} />
              <List.Item.Detail.Metadata.Label
                title="Restorative Sleep"
                text={`${Math.round(
                  ((totalRemSleepTimeMilli + totalSlowWaveSleepTimeMilli) / totalInBedTimeMilli) * 100,
                )}%  ·  ${formatMillis(totalRemSleepTimeMilli + totalSlowWaveSleepTimeMilli)}`}
              />
              <List.Item.Detail.Metadata.Label title="Wake Events" text={`${wakeEvents}/h`} />
              <List.Item.Detail.Metadata.Label title="Respiratory Rate" text={`${respiratoryRate} rpm`} />
              <List.Item.Detail.Metadata.Label title=" " />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function BiometricsCommand() {
  const { data, error, isLoading } = useCachedPromise(
    () => Promise.all([getCycleCollection(), getRecoveryCollection(), getSleepCollection()]),
    [],
    {
      keepPreviousData: true,
    },
  );

  let cycleCollection: PaginatedCycleResponse | undefined;
  let recoveryCollection: PaginatedRecoveryResponse | undefined;
  let sleepCollection: PaginatedSleepResponse | undefined;

  if (data) {
    [cycleCollection, recoveryCollection, sleepCollection] = data;
  }

  React.useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data",
        message: error.message,
      });
    }
  }, [error]);

  const findRecoveryForCycle = (cycleId: number) => {
    return recoveryCollection?.records?.find((recovery) => recovery.cycle_id === cycleId);
  };

  const findSleepForRecovery = (sleepId: number) => {
    return sleepCollection?.records?.find((sleep) => sleep.id === sleepId);
  };

  return (
    <List
      navigationTitle="Biometrics"
      searchBarPlaceholder="Search"
      isLoading={isLoading}
      throttle={true}
      isShowingDetail
    >
      {cycleCollection?.records?.map((cycle: Cycle) => {
        const recovery = findRecoveryForCycle(cycle.id);
        const sleep = recovery ? findSleepForRecovery(recovery.sleep_id) : undefined;
        return <CycleListItem key={cycle.id} cycle={cycle} recovery={recovery} sleep={sleep} isLoading={isLoading} />;
      })}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <BiometricsCommand />
    </View>
  );
}
