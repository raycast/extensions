import { Detail, Icon } from "@raycast/api";
import { Workout } from "../lib/types";
import { formatDate, formatDateTime } from "../lib/helpers/dates";
import { formatDuration, formatWorkoutDuration } from "../lib/helpers/durations";
import { formatWeight, formatReps, formatDistance, formatRPE } from "../lib/helpers/formatters";

type WorkoutDetailProps = {
  workout: Workout;
};

export default function WorkoutDetail({ workout }: WorkoutDetailProps) {
  const exerciseCount = workout.exercises.length;
  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const duration = formatWorkoutDuration(workout.start_time, workout.end_time);

  let markdown = `# ${workout.title}\n\n`;

  // Add description if available
  if (workout.description) {
    markdown += `${workout.description}\n\n`;
  }

  markdown += `---\n\n`;

  // Add exercises
  workout.exercises.forEach((exercise, exerciseIndex) => {
    markdown += `## ${exerciseIndex + 1}. ${exercise.title}\n\n`;

    if (exercise.notes) {
      markdown += `*${exercise.notes}*\n\n`;
    }

    // Create bullet points for sets
    exercise.sets.forEach((set, setIndex) => {
      const parts: string[] = [];

      if (set.weight_kg !== null) {
        parts.push(formatWeight(set.weight_kg));
      }
      if (set.reps !== null) {
        parts.push(`${formatReps(set.reps)} reps`);
      }
      if (set.distance_meters !== null) {
        parts.push(formatDistance(set.distance_meters));
      }
      if (set.duration_seconds !== null) {
        parts.push(formatDuration(set.duration_seconds));
      }
      if (set.rpe !== null) {
        parts.push(`RPE ${formatRPE(set.rpe)}`);
      }

      const setInfo = parts.length > 0 ? ` • ${parts.join(" • ")}` : "";
      markdown += `- Set ${setIndex + 1}${setInfo}\n`;
    });

    markdown += `\n`;
  });

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Exercises" text={String(exerciseCount)} />
          <Detail.Metadata.Label title="Total Sets" text={String(totalSets)} />
          <Detail.Metadata.Label title="Duration" text={duration} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Start Time" text={formatDateTime(workout.start_time)} icon={Icon.Clock} />
          <Detail.Metadata.Label title="End Time" text={formatDateTime(workout.end_time)} icon={Icon.Clock} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={formatDate(workout.created_at)} icon={Icon.Calendar} />
          <Detail.Metadata.Label title="Updated" text={formatDate(workout.updated_at)} icon={Icon.ArrowClockwise} />
        </Detail.Metadata>
      }
    />
  );
}
