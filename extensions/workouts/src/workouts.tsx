import { ActionPanel, List, Action, getPreferenceValues, Toast, showToast, Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise, usePromise, withAccessToken } from "@raycast/utils";
import { PAGE_SIZE, getActivities, getActivity, provider } from "./api/client";
import { useEffect } from "react";
import { StravaActivitySummary } from "./api/types";
import { sportIcons, sportNames } from "./constants";
import { formatDistance, formatElevationGain, formatSpeedForSportType, generateMapboxImage } from "./utils";

export function Splits({ activityId }: { activityId: StravaActivitySummary["id"] }) {
  const { data: activity, isLoading } = usePromise(() => getActivity(activityId), []);

  if (isLoading || !activity) {
    return <Detail isLoading={true} />;
  }

  const preferences = getPreferenceValues<Preferences>();
  const splits = preferences.distance_unit === "km" ? activity.splits_metric : activity.splits_standard;

  const maxSpeed = Math.max(...splits.map((split) => split.average_speed));
  const speedToBarLength = (speed: number) => Math.round((speed / maxSpeed) * 10); // Adjusted to cap at 10 blocks

  const markdownSplits = `
| Split | Average Speed |  | Elevation Difference |
|-------|---------------|--|----------------------|
${
  splits?.length
    ? splits
        .map((split, index) => {
          const barLength = speedToBarLength(split.average_speed);
          const speedBar = "█".repeat(barLength);
          const elevationSymbol = split.elevation_difference > 0 ? "↑" : "↓";
          return `| ${index + 1} (${formatDistance(split.distance)}) | ${formatSpeedForSportType(activity.type, split.average_speed)} | ${speedBar} | ${elevationSymbol} ${Math.abs(split.elevation_difference)}${preferences.distance_unit === "km" ? "m" : "ft"} |`;
        })
        .join("\n")
    : "No splits available"
}`;

  return (
    <Detail
      markdown={markdownSplits}
      navigationTitle={activity.name}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View on Strava" url={`https://www.strava.com/activities/${activityId}/`} />
        </ActionPanel>
      }
    />
  );
}

export function Activity({ activity, isLoading }: { activity: StravaActivitySummary; isLoading: boolean }) {
  const sportType = sportNames[activity.sport_type] ?? "Workout";
  const date = new Date(activity.start_date_local).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const formattedDuration = new Date(activity.elapsed_time * 1000).toISOString().substring(11, 19);
  const formattedMovingTime = new Date(activity.moving_time * 1000).toISOString().substring(11, 19);
  const formattedHeartRate = `${Math.floor(activity.average_heartrate || 0)} bpm`;
  const formattedKilojoules = `${activity.kilojoules} kJ`;
  const speedTitle = `Average ${["run", "swim"].includes(activity.type.toLowerCase()) ? "Pace" : "Speed"}`;
  const formattedSpeed = formatSpeedForSportType(activity.type, activity.average_speed);
  const formattedDistance = formatDistance(activity.distance);
  const mapboxImage = generateMapboxImage(activity.map.summary_polyline);
  const elevationGain = formatElevationGain(activity.total_elevation_gain);

  const stravaLink = `https://www.strava.com/activities/${activity.id}/`;

  return (
    <List.Item
      title={{
        value: sportType,
        tooltip: activity.name,
      }}
      accessories={[{ text: date }]}
      icon={{
        source: sportIcons[activity.type] ?? sportIcons["Workout"],
        tintColor: Color.PrimaryText,
      }}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          markdown={mapboxImage ? `![](${mapboxImage})` : undefined}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={activity.name} />
              <List.Item.Detail.Metadata.Separator />

              {activity.average_speed ||
              activity.average_watts ||
              activity.total_elevation_gain ||
              activity.distance ? (
                <>
                  {activity.distance ? (
                    <List.Item.Detail.Metadata.Label title="Distance" text={formattedDistance} />
                  ) : null}
                  {activity.average_speed ? (
                    <List.Item.Detail.Metadata.Label title={speedTitle} text={formattedSpeed} />
                  ) : null}
                  {activity.average_watts ? (
                    <List.Item.Detail.Metadata.Label title="Average Power" text={activity.average_watts.toString()} />
                  ) : null}
                  {activity.total_elevation_gain ? (
                    <List.Item.Detail.Metadata.Label title="Elevation Gain" text={elevationGain} />
                  ) : null}
                  <List.Item.Detail.Metadata.Separator />
                </>
              ) : null}

              {activity.moving_time && activity.moving_time !== activity.elapsed_time ? (
                <List.Item.Detail.Metadata.Label title="Moving Time" text={formattedMovingTime} />
              ) : null}
              {activity.elapsed_time ? (
                <List.Item.Detail.Metadata.Label title="Elapsed Time" text={formattedDuration} />
              ) : null}

              <List.Item.Detail.Metadata.Separator />
              {activity.average_heartrate ? (
                <List.Item.Detail.Metadata.Label title="Average Heart Rate" text={formattedHeartRate} />
              ) : null}
              {activity.suffer_score ? (
                <List.Item.Detail.Metadata.Label
                  title="Relative Effort"
                  text={{
                    value: activity.suffer_score.toString(),
                    color: Color.Red,
                  }}
                />
              ) : null}
              {activity.kilojoules ? (
                <List.Item.Detail.Metadata.Label title="Energy Output" text={formattedKilojoules} />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View on Strava" url={stravaLink} />
          <Action.CopyToClipboard title="Copy Strava Link" content={stravaLink} />
          {activity.distance ? (
            <Action.Push
              icon={Icon.BarChart}
              title="View Splits"
              target={<Splits activityId={activity.id} />}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          ) : null}
        </ActionPanel>
      }
      keywords={[activity.name]}
    />
  );
}

function Workouts() {
  const {
    isLoading,
    data: activities,
    pagination,
    error,
  } = useCachedPromise(
    () => async (options: { page: number }) => {
      const newData = await getActivities(options.page + 1, PAGE_SIZE);
      return { data: newData, hasMore: newData.length === PAGE_SIZE };
    },
    [],
  );

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not load workouts",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List searchBarPlaceholder="Search workouts" isLoading={isLoading} pagination={pagination} throttle isShowingDetail>
      {activities?.map((activity) => <Activity key={activity.id} activity={activity} isLoading={isLoading} />)}
    </List>
  );
}

export default withAccessToken(provider)(Workouts);
