// Reference: https://api.hevyapp.com/docs/#/Workouts

export type WorkoutsRequest = {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
};

export type WorkoutSet = {
  index: number;
  type: "normal" | "warmup" | "dropset" | "failure";
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric: unknown | null;
};

export type WorkoutExercise = {
  index: number;
  title: string;
  notes: string;
  exercise_template_id: string;
  superset_id: string | null;
  sets: WorkoutSet[];
};

export type Workout = {
  id: string;
  title: string;
  routine_id: string | null;
  description: string;
  start_time: string;
  end_time: string;
  updated_at: string;
  created_at: string;
  exercises: WorkoutExercise[];
};

export type WorkoutsResponse = {
  page: number;
  page_count: number;
  workouts: Workout[];
};
