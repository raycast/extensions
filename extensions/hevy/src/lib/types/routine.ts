// Reference: https://api.hevyapp.com/docs/#/Routines

export type RoutinesRequest = {
  page?: number;
  pageSize?: number;
  folder_id?: string;
};

export type RoutineSet = {
  sets: number;
  reps: string;
  rest_period: number;
};

export type RoutineExercise = {
  name: string;
  sets: RoutineSet;
  exercise_template_id: string;
};

export type Routine = {
  id: string;
  title: string;
  description?: string;
  folder_id?: string;
  exercises: RoutineExercise[];
  created_at: string;
  updated_at: string;
};

export type RoutinesResponse = {
  routines: Routine[];
  pagination: {
    total_routines: number;
    current_page: number;
    total_pages: number;
  };
};
