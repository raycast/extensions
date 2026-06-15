import { Detail, Icon } from "@raycast/api";
import { Routine } from "../lib/types";
import { formatDate } from "../lib/helpers/dates";
import { formatDuration } from "../lib/helpers/durations";
import { formatWeight, formatReps, formatDistance } from "../lib/helpers/formatters";

type RoutineDetailProps = {
  routine: Routine;
};

export default function RoutineDetail({ routine }: RoutineDetailProps) {
  const exerciseCount = routine.exercises.length;
  const totalSets = routine.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);

  let markdown = `# ${routine.title}\n\n`;

  if (routine.folder_id) {
    markdown += `**Folder ID:** ${routine.folder_id}  \n\n`;
  }
  markdown += `---\n\n`;

  // Add exercises
  routine.exercises.forEach((exercise, exerciseIndex) => {
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

      const setInfo = parts.length > 0 ? ` • ${parts.join(" • ")}` : "";
      markdown += `- Set ${setIndex + 1}${setInfo}\n`;
    });

    if (exercise.rest_seconds > 0) {
      markdown += `\n**Rest:** ${formatDuration(exercise.rest_seconds)}\n`;
    }

    markdown += `\n`;
  });

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Exercises" text={String(exerciseCount)} />
          <Detail.Metadata.Label title="Total Sets" text={String(totalSets)} />
          {routine.folder_id && <Detail.Metadata.Label title="Folder ID" text={routine.folder_id} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={formatDate(routine.created_at)} icon={Icon.Calendar} />
          <Detail.Metadata.Label title="Updated" text={formatDate(routine.updated_at)} icon={Icon.ArrowClockwise} />
        </Detail.Metadata>
      }
    />
  );
}
