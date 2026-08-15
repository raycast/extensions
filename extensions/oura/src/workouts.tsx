import { List, Color, LaunchProps, Icon } from "@raycast/api";
import { oura } from "./utils/ouraData";
import { getDate, getTimeDifference, calculatePastDate } from "./utils/datetime";
import { WorkoutResponse } from "./types";
import { convertMeters, numberWithCommas } from "./utils/measurement";
import Unauthorized from "./unauthorized";

type ActivityData = {
  id: string;
  activity: string;
  calories: null;
  day: string;
  distance: number;
  end_datetime: string;
  intensity: string;
  label: null;
  source: string;
  start_datetime: string;
};

function getWorkoutIcon(activity: string) {
  switch (activity) {
    case "running":
      return Icon.Heartbeat;
    case "cycling":
      return Icon.Bike;
    case "swimming":
      return Icon.Raindrop;
    case "walking":
      return Icon.Footprints;
    case "climbing":
      return Icon.Mountain;
    default:
      return Icon.Heart;
  }
}

function getWorkoutIntensity(intensity: string) {
  switch (intensity) {
    case "easy":
      return Color.Green;
    case "moderate":
      return Color.Yellow;
    case "hard":
      return Color.Red;
    default:
      return Color.Blue;
  }
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Workouts }>) {
  const { days } = props.arguments;
  let daysAgo = getDate();
  if (days) {
    daysAgo = calculatePastDate(parseInt(days));
  }
  if (daysAgo === null || daysAgo === undefined || daysAgo === "0NaN-NaN-NaN") {
    return (
      <List>
        <List.Item
          title={`Invalid Days Ago argument.`}
          subtitle={`Please try again with an integer between 1 and 10.`}
        />
      </List>
    );
  }

  const workouts = oura(`usercollection/workout?start_date=${daysAgo}&end_date=${getDate(1)}`) as WorkoutResponse;
  if (workouts.isLoading) {
    return (
      <List isLoading={workouts.isLoading}>
        <List.Item title={`Workouts`} subtitle={`Loading...`} />
      </List>
    );
  }

  if (workouts.error) {
    return <Unauthorized />;
  }

  const wToday = workouts?.data.data.reverse();
  let totalTime = 0;
  let totalCals = 0;
  let totalDistance = 0;
  return (
    <List isLoading={workouts.isLoading}>
      {wToday.map((workout: ActivityData) => {
        totalTime += getTimeDifference(workout.start_datetime, workout.end_datetime);
        totalCals += workout.calories || 0;
        totalDistance += workout.distance;

        const accessories = [
          { tag: { value: `${workout.intensity}`, color: getWorkoutIntensity(workout.intensity) } },
          { tag: { value: `${convertMeters(workout.distance)}`, color: Color.Green } },
        ];

        if (workout.calories) {
          accessories.push({ tag: { value: `Calories: ${numberWithCommas(workout.calories)}`, color: Color.Green } });
        }

        if (workout.label) {
          accessories.push({ tag: { value: `Label: ${workout.label}`, color: Color.Green } });
        }

        return (
          <List.Item
            icon={getWorkoutIcon(workout.activity)}
            key={workout.id}
            title={`${workout.start_datetime.split("T")[0]} - ${workout.activity}`}
            subtitle={`for ${getTimeDifference(workout.start_datetime, workout.end_datetime)} mins`}
            accessories={accessories}
          />
        );
      })}
      <List.Item
        icon={Icon.BarChart}
        title={`Totals:`}
        subtitle={`${totalTime} mins`}
        accessories={[
          { tag: { value: `Distance: ${convertMeters(totalDistance)}`, color: Color.Green } },
          { tag: { value: `Calories: ${numberWithCommas(totalCals)}`, color: Color.Green } },
        ]}
      />
    </List>
  );
}
