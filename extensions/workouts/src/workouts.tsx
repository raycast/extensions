import { ActionPanel, List, Action, getPreferenceValues, Toast, showToast, Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise, usePromise, withAccessToken } from "@raycast/utils";
import { PAGE_SIZE, getActivities, getActivity, provider } from "./api/client";
import { useEffect, useMemo } from "react";
import { StravaActivitySummary } from "./api/types";
import { sportIcons } from "./constants";
import {
  formatAccessoryDate,
  formatDistance,
  formatDuration,
  formatElevationGain,
  formatSpeedForSportType,
  generateMapboxImage,
  getWorkoutTypeLabel,
  getWorkoutTypeColor,
  parseLocalDate,
} from "./utils";

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
  const activityDate = parseLocalDate(activity.start_date_local);
  const formattedDuration = formatDuration(activity.elapsed_time);
  const formattedMovingTime = formatDuration(activity.moving_time);
  const formattedHeartRate = activity.average_heartrate ? `${Math.floor(activity.average_heartrate)} bpm` : undefined;
  const formattedKilojoules = activity.kilojoules ? `${activity.kilojoules} kJ` : undefined;
  const speedTitle = `Average ${["run", "swim"].includes(activity.type.toLowerCase()) ? "Pace" : "Speed"}`;
  const formattedSpeed = activity.average_speed
    ? formatSpeedForSportType(activity.type, activity.average_speed)
    : undefined;
  const formattedDistance = formatDistance(activity.distance);
  const mapboxImage = generateMapboxImage(activity.map.summary_polyline);
  const elevationGain = formatElevationGain(activity.total_elevation_gain);
  const workoutLabel = getWorkoutTypeLabel(activity.sport_type, activity.workout_type);

  const stravaLink = `https://www.strava.com/activities/${activity.id}/`;

  const hasTags = !!(workoutLabel || activity.commute || activity.trainer);

  return (
    <List.Item
      title={activity.name}
      accessories={[{ text: formatAccessoryDate(activityDate) }]}
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
              {activity.description ? (
                <List.Item.Detail.Metadata.Label title="Description" text={activity.description} />
              ) : null}
              {hasTags ? (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {workoutLabel ? (
                    <List.Item.Detail.Metadata.TagList.Item
                      text={workoutLabel}
                      color={getWorkoutTypeColor(workoutLabel)}
                    />
                  ) : null}
                  {activity.commute ? (
                    <List.Item.Detail.Metadata.TagList.Item text="Commute" color={Color.Green} />
                  ) : null}
                  {activity.trainer ? (
                    <List.Item.Detail.Metadata.TagList.Item text="Trainer" color={Color.Purple} />
                  ) : null}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
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
                  {activity.max_speed ? (
                    <List.Item.Detail.Metadata.Label
                      title="Max Speed"
                      text={formatSpeedForSportType(activity.type, activity.max_speed)}
                    />
                  ) : null}
                  {activity.average_watts ? (
                    <List.Item.Detail.Metadata.Label title="Average Power" text={`${activity.average_watts} W`} />
                  ) : null}
                  {activity.weighted_average_watts ? (
                    <List.Item.Detail.Metadata.Label
                      title="Weighted Average Power"
                      text={`${activity.weighted_average_watts} W`}
                    />
                  ) : null}
                  {activity.average_cadence ? (
                    <List.Item.Detail.Metadata.Label
                      title="Average Cadence"
                      text={`${Math.round(activity.average_cadence)} rpm`}
                    />
                  ) : null}
                  {activity.total_elevation_gain ? (
                    <List.Item.Detail.Metadata.Label title="Elevation Gain" text={elevationGain} />
                  ) : null}
                  {activity.elev_high != null ? (
                    <List.Item.Detail.Metadata.Label
                      title="Max Elevation"
                      text={formatElevationGain(activity.elev_high)}
                    />
                  ) : null}
                  {activity.elev_low != null ? (
                    <List.Item.Detail.Metadata.Label
                      title="Min Elevation"
                      text={formatElevationGain(activity.elev_low)}
                    />
                  ) : null}
                  <List.Item.Detail.Metadata.Separator />
                </>
              ) : null}

              <List.Item.Detail.Metadata.Label
                title="Start Time"
                text={activityDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              />
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
              {activity.max_heartrate ? (
                <List.Item.Detail.Metadata.Label
                  title="Max Heart Rate"
                  text={`${Math.round(activity.max_heartrate)} bpm`}
                />
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

              {activity.kudos_count || activity.achievement_count || activity.pr_count ? (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Stats">
                    {activity.kudos_count ? (
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${activity.kudos_count} kudos`}
                        color={Color.Orange}
                      />
                    ) : null}
                    {activity.achievement_count ? (
                      <List.Item.Detail.Metadata.TagList.Item
                        text={`${activity.achievement_count} achievements`}
                        color={Color.Yellow}
                      />
                    ) : null}
                    {activity.pr_count ? (
                      <List.Item.Detail.Metadata.TagList.Item text={`${activity.pr_count} PRs`} color={Color.Purple} />
                    ) : null}
                  </List.Item.Detail.Metadata.TagList>
                </>
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

function groupActivitiesByMonth(activities: StravaActivitySummary[]): [string, StravaActivitySummary[]][] {
  const groups = new Map<string, StravaActivitySummary[]>();
  for (const activity of activities) {
    const key = parseLocalDate(activity.start_date_local).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const existing = groups.get(key);
    if (existing) {
      existing.push(activity);
    } else {
      groups.set(key, [activity]);
    }
  }
  return Array.from(groups.entries());
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

  const groupedActivities = useMemo(() => {
    if (!activities) return [];
    return groupActivitiesByMonth(activities);
  }, [activities]);

  return (
    <List searchBarPlaceholder="Search workouts" isLoading={isLoading} pagination={pagination} throttle isShowingDetail>
      {groupedActivities.map(([monthTitle, monthActivities]) => (
        <List.Section key={monthTitle} title={monthTitle}>
          {monthActivities.map((activity) => (
            <Activity key={activity.id} activity={activity} isLoading={isLoading} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default withAccessToken(provider)(Workouts);
