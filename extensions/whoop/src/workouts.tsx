import React from "react";
import { Color, List, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { getProgressIcon, useCachedPromise } from "@raycast/utils";
import { getWorkoutCollection } from "./api/client";
import { View } from "./components/View";
import { Workout } from "./helpers/whoop.api";
import { WhoopColor } from "./helpers/constants";
import { calcCals, formatDate, formatHeartRate, formatMillis, formatStrain } from "./helpers/formats";
import { getSportName } from "./helpers/workouts";

enum Units {
  metric = "metric",
  imperial = "imperial",
}

interface Preferences {
  units: Units;
}

function CycleListItem({ workout, isLoading, units }: { workout: Workout; isLoading: boolean; units: Units }) {
  // WORKOUT STUFF
  const sportName = getSportName(workout.sport_id);

  const strain = formatStrain(workout.score?.strain);
  const averageHeartRate = formatHeartRate(workout.score?.average_heart_rate);
  const maxHeartRate = formatHeartRate(workout.score?.max_heart_rate);
  const cals = calcCals(workout.score?.kilojoule);

  const zoneFiveMilli = workout.score?.zone_duration.zone_five_milli || 0;
  const zoneFourMilli = workout.score?.zone_duration.zone_four_milli || 0;
  const zoneThreeMilli = workout.score?.zone_duration.zone_three_milli || 0;
  const zoneTwoMilli = workout.score?.zone_duration.zone_two_milli || 0;
  const zoneOneMilli = workout.score?.zone_duration.zone_one_milli || 0;
  const zoneZeroMilli = workout.score?.zone_duration.zone_zero_milli || 0;

  const durationMilli = new Date(workout.end).getTime() - new Date(workout.start).getTime();

  const distanceMeter = workout.score?.distance_meter;
  const altitudeGainMeter = workout.score?.altitude_gain_meter;
  const altitudeChangeMeter = workout.score?.altitude_change_meter;

  let distance, altitudeGain, altitudeChange;

  if (units === Units.metric) {
    distance = distanceMeter ? `${(distanceMeter / 1000).toFixed(2)}km` : "n/a";
    altitudeGain = altitudeGainMeter ? `${Math.round(altitudeGainMeter)}m` : "n/a";
    altitudeChange = altitudeChangeMeter ? `${Math.round(altitudeChangeMeter)}m` : "n/a";
  } else if (units === Units.imperial) {
    const metersToMiles = 0.000621371;
    const metersToFeet = 3.28084;
    distance = distanceMeter ? `${(distanceMeter * metersToMiles).toFixed(2)}mi` : "n/a";
    altitudeGain = altitudeGainMeter ? `${Math.round(altitudeGainMeter * metersToFeet)}ft` : "n/a";
    altitudeChange = altitudeChangeMeter ? `${Math.round(altitudeChangeMeter * metersToFeet)}ft` : "n/a";
  }

  function getZonePercentage(zoneMilli: number) {
    return `${Math.round((zoneMilli / durationMilli) * 100)}%`;
  }

  function getZoneText(zoneMilli: number) {
    return `${getZonePercentage(zoneMilli)}  ·  ${formatMillis(zoneMilli, true)}`;
  }

  return (
    <List.Item
      title={`${formatDate(workout.created_at, "MMM d", true)}  ·  ${sportName}`}
      accessories={[{ icon: getProgressIcon(strain / 21, WhoopColor.strain) }]}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title={sportName}
                text={`${formatDate(workout.start, "HH:ss")} -> ${formatDate(workout.end, "HH:ss")}`}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Strain">
                <List.Item.Detail.Metadata.TagList.Item text={`${strain}`} color={WhoopColor.strain} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Average Heart Rate">
                <List.Item.Detail.Metadata.TagList.Item text={`${averageHeartRate} bpm`} color={Color.SecondaryText} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Max Heart Rate">
                <List.Item.Detail.Metadata.TagList.Item text={`${maxHeartRate} bpm`} color={Color.SecondaryText} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Calories">
                <List.Item.Detail.Metadata.TagList.Item text={`${cals} Cal`} color={Color.SecondaryText} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.TagList title="Total Duration">
                <List.Item.Detail.Metadata.TagList.Item
                  text={`${formatMillis(durationMilli, true)}`}
                  color={Color.SecondaryText}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Zone 5 (90-100%)">
                <List.Item.Detail.Metadata.TagList.Item text={getZoneText(zoneFiveMilli)} color={WhoopColor.zone5} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Zone 4 (80-90%)">
                <List.Item.Detail.Metadata.TagList.Item text={getZoneText(zoneFourMilli)} color={WhoopColor.zone4} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Zone 3 (70-80%)">
                <List.Item.Detail.Metadata.TagList.Item text={getZoneText(zoneThreeMilli)} color={WhoopColor.zone3} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Zone 2 (60-70%)">
                <List.Item.Detail.Metadata.TagList.Item text={getZoneText(zoneTwoMilli)} color={WhoopColor.zone2} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Zone 1 (50-60%)">
                <List.Item.Detail.Metadata.TagList.Item text={getZoneText(zoneOneMilli)} color={WhoopColor.zone1} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.TagList title="Restorative (0-50%)">
                <List.Item.Detail.Metadata.TagList.Item text={getZoneText(zoneZeroMilli)} color={WhoopColor.zone0} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Distance" text={`${distance}`} />
              <List.Item.Detail.Metadata.Label title="Altitude Gain" text={`${altitudeGain}`} />
              <List.Item.Detail.Metadata.Label title="Altitude Change" text={`${altitudeChange}`} />
              <List.Item.Detail.Metadata.Label title=" " />
            </List.Item.Detail.Metadata>
          }
        />
      }
    />
  );
}

function WorkoutsCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const {
    data: workouts,
    error,
    isLoading,
  } = useCachedPromise(() => getWorkoutCollection(), [], {
    keepPreviousData: true,
  });

  React.useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load data",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List
      navigationTitle="Workouts"
      searchBarPlaceholder="Search"
      isLoading={isLoading}
      throttle={true}
      isShowingDetail
    >
      {workouts?.records?.map((workout: Workout) => {
        return <CycleListItem key={workout.id} workout={workout} isLoading={isLoading} units={preferences.units} />;
      })}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <WorkoutsCommand />
    </View>
  );
}
