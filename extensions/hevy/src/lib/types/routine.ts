// Reference: https://api.hevyapp.com/docs/#/Routines

export type RoutinesRequest = {
  page?: number;
  pageSize?: number;
  folder_id?: string;
};

export type RoutineSet = {
  index: number;
  type: "normal" | "warmup" | "dropset" | "failure";
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  custom_metric: unknown | null;
};

export type RoutineExercise = {
  index: number;
  title: string;
  notes: string | null;
  exercise_template_id: string;
  superset_id: string | null;
  sets: RoutineSet[];
  rest_seconds: number;
};

export type Routine = {
  id: string;
  title: string;
  folder_id: string | null;
  updated_at: string;
  created_at: string;
  exercises: RoutineExercise[];
};

export type RoutinesResponse = {
  page: number;
  page_count: number;
  routines: Routine[];
};
