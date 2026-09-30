import { List, updateCommandMetadata } from "@raycast/api";
import { oura } from "./utils/ouraData";
import { getDate } from "./utils/datetime";
import { ActivityResponse } from "./types";
import { minutesFormatted, convertMeters, numberWithCommas } from "./utils/measurement";
import { Color } from "@raycast/api";
import { getProgressStatus } from "./utils/measurement";
import Unauthorized from "./unauthorized";

function distanceToGoal(distance: number) {
  // if distance is negative, we've already met the goal
  if (distance < 0) {
    const distanceToGo = convertMeters(distance * -1);
    return `Goal met! ${distanceToGo} over.`;
  } else {
    const distanceToGo = convertMeters(distance);
    return `${distanceToGo} to go.`;
  }
}

export default function Command() {
  const activity = oura(
    `usercollection/daily_activity?start_date=${getDate()}&end_date=${getDate(1)}`,
  ) as ActivityResponse;

  if (activity.isLoading) {
    return (
      <List isLoading={activity.isLoading}>
        <List.Item title={`Activity Score`} subtitle={`Loading...`} />
        <List.Item title={`Activity Workout`} subtitle={`Loading...`} />
        <List.Item title={`Activity Met`} subtitle={`Loading...`} />
        <List.Item title={`Relax Time`} subtitle={`Loading...`} />
        <List.Item title={`Walking Distance (equivalent)`} subtitle={`Loading...`} />
        <List.Item title={`Distance to meet goal:`} subtitle={`Loading...`} />
        <List.Item title={`Activity Contributors (% of how it impacts your Activity Score):`} />
        <List.Item title={`└— Recovery Time`} subtitle={`Loading...`} />
        <List.Item title={`└— Stay Active`} subtitle={`Loading...`} />
        <List.Item title={`└— Meet Daily Target`} subtitle={`Loading...`} />
        <List.Item title={`└— Training Frequency:`} subtitle={`Loading...`} />
        <List.Item title={`└— Training Volume:`} subtitle={`Loading...`} />
        <List.Item title={`└— Move Every Hours:`} subtitle={`Loading...`} />
      </List>
    );
  }

  if (activity.error) {
    return <Unauthorized />;
  }

  if (!activity.data.data.length) {
    return (
      <List>
        <List.Item title={`Activity Score`} subtitle={`No activity data available. Open the Oura app to sync data.`} />
      </List>
    );
  }

  const aToday = activity?.data.data[0];
  if (!activity.isLoading) {
    updateCommandMetadata({
      subtitle: `Activity: ${aToday.score} · Steps: ${numberWithCommas(aToday.steps)}`,
    });
  }

  return (
    <List isLoading={activity.isLoading}>
      <List.Item
        title={`Activity Score`}
        subtitle={`${aToday.score}`}
        icon={getProgressStatus(aToday.score)}
        accessories={[
          { tag: { value: `Steps: ${numberWithCommas(aToday.steps)}`, color: Color.Green } },
          { tag: { value: `Active Calories: ${numberWithCommas(aToday.active_calories)}`, color: Color.Green } },
          { tag: { value: `Total Calories: ${numberWithCommas(aToday.total_calories)}`, color: Color.Green } },
        ]}
      />
      <List.Item
        title={`Activity Workout`}
        accessories={[
          { tag: { value: `High: ${minutesFormatted(aToday.high_activity_time / 60)}`, color: Color.Green } },
          { tag: { value: `Medium: ${minutesFormatted(aToday.medium_activity_time / 60)}`, color: Color.Yellow } },
          { tag: { value: `Low: ${minutesFormatted(aToday.low_activity_time / 60)}`, color: Color.Magenta } },
        ]}
      />
      <List.Item
        title={`Activity Met`}
        accessories={[
          { tag: { value: `High: ${minutesFormatted(aToday.high_activity_met_minutes / 60)}`, color: Color.Green } },
          {
            tag: { value: `Medium: ${minutesFormatted(aToday.medium_activity_met_minutes / 60)}`, color: Color.Yellow },
          },
          { tag: { value: `Low: ${minutesFormatted(aToday.low_activity_met_minutes / 60)}`, color: Color.Magenta } },
        ]}
      />
      <List.Item
        title={`Relax Time`}
        accessories={[
          { tag: { value: `Resting: ${minutesFormatted(aToday.resting_time / 60)}`, color: Color.SecondaryText } },
          { tag: { value: `Sedentary: ${minutesFormatted(aToday.sedentary_time / 60)}`, color: Color.SecondaryText } },
          { tag: { value: `Not wearing: ${minutesFormatted(aToday.non_wear_time / 60)}`, color: Color.SecondaryText } },
        ]}
      />
      <List.Item
        title={`Walking Distance (equivalent)`}
        subtitle={`${convertMeters(aToday.equivalent_walking_distance)}`}
      />
      <List.Item title={`Distance to meet goal:`} subtitle={`${distanceToGoal(aToday.meters_to_target)}`} />
      <List.Item title={`Activity Contributors (% of how it impacts your Activity Score):`} />
      <List.Item
        title={`└— Recovery Time`}
        icon={getProgressStatus(aToday.contributors.recovery_time)}
        subtitle={`${aToday.contributors.recovery_time}%`}
      />
      <List.Item
        title={`└— Stay Active`}
        icon={getProgressStatus(aToday.contributors.stay_active)}
        subtitle={`${aToday.contributors.stay_active}%`}
      />
      <List.Item
        title={`└— Meet Daily Target`}
        icon={getProgressStatus(aToday.contributors.meet_daily_targets)}
        subtitle={`${aToday.contributors.meet_daily_targets}%`}
      />
      <List.Item
        title={`└— Training Frequency:`}
        icon={getProgressStatus(aToday.contributors.training_frequency)}
        subtitle={`${aToday.contributors.training_frequency}%`}
      />
      <List.Item
        title={`└— Training Volume:`}
        icon={getProgressStatus(aToday.contributors.training_volume)}
        subtitle={`${aToday.contributors.training_volume}%`}
      />
      <List.Item
        title={`└— Move Every Hours:`}
        icon={getProgressStatus(aToday.contributors.move_every_hour)}
        subtitle={`${aToday.contributors.move_every_hour}%`}
      />
    </List>
  );
}
