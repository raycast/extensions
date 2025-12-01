// Reference: https://api.hevyapp.com/docs/#/Workouts

export type WorkoutsRequest = {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
};

export type WorkoutSet = {
  weight_kg: number;
  reps: number;
  rpe?: number;
  type?: "normal" | "warmup" | "dropset" | "failure";
  duration_seconds?: number;
};

export type WorkoutExercise = {
  name: string;
  exercise_template_id: string;
  sets: WorkoutSet[];
  thumbnail_url?: string;
};

export type Workout = {
  id: string;
  title: string;
  date: string;
  duration: number;
  total_volume: number;
  routine_id?: string;
  exercises: WorkoutExercise[];
  note?: string;
};

export type WorkoutsResponse = {
  workouts: Workout[];
  pagination: {
    total_workouts: number;
    current_page: number;
    total_pages: number;
  };
};
