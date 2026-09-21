export type StepType =
  | "warmup"
  | "cooldown"
  | "interval"
  | "recovery"
  | "repeat";

export type EndCondition =
  | "lap.button"
  | "time"
  | "distance"
  | "iterations"
  | "heart.rate"
  | "power"
  | "open";

export type TargetType =
  | "no.target"
  | "heart.rate"
  | "pace"
  | "power"
  | "speed"
  | "cadence";

export type WorkoutStep = {
  stepType: Exclude<StepType, "repeat">;
  displayName: string;
  description?: string | null;
  endCondition: EndCondition;
  endConditionValue?: number | null;
  targetType?: TargetType | null;
  targetValueOne?: number | null;
  targetValueTwo?: number | null;
  zoneNumber?: number | null;
  secondaryTargetType?: TargetType | null;
  secondaryTargetValueOne?: number | null;
  secondaryTargetValueTwo?: number | null;
  secondaryZoneNumber?: number | null;
};

export type RepeatStep = {
  stepType: "repeat";
  numberOfIterations: number;
  skipLastRestStep?: boolean | null;
  workoutSteps: WorkoutStep[];
};

export type Step = WorkoutStep | RepeatStep;

export type Activity = {
  id: string;
  date: string;
  title: string;
  description: string | null;
  sportType: SportType;
  distance: number | null;
  duration: number | null;
  speed: number | null;
  heartRate: number | null;
  power: number | null;
  load: number | null;
  elevationGain: number | null;
  completed: boolean;
  target: "distance" | "time" | "pace" | "steps" | null;
  steps: Step[] | null;
  source: string | null;
  externalId: string | null;
  plannedActivityId: string | null;
  completedActivityId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type SportType =
  | "run"
  | "bike"
  | "swim"
  | "hike"
  | "yoga"
  | "tennis"
  | "skiing"
  | "nordicski"
  | "strength"
  | "surf"
  | "other";

export type CreateActivityInput = {
  date: string;
  title: string;
  sportType: SportType;
  description?: string;
  distance?: number;
  duration?: number;
  speed?: number;
  heartRate?: number;
  power?: number;
  load?: number;
  elevationGain?: number;
  completed?: boolean;
  target?: "distance" | "time" | "pace" | "steps";
  steps?: Step[];
};

export type ListActivitiesParams = {
  from?: string;
  to?: string;
  sportType?: SportType;
  completed?: string;
  limit?: number;
  offset?: number;
  includePaired?: boolean;
};

export type ListActivitiesResponse = {
  activities: Activity[];
  total: number;
  limit: number;
  offset: number;
};

export type ActivityResponse = {
  activity: Activity;
};

export type DeleteResponse = {
  deleted: true;
};

export type BatchDeleteResponse = {
  deleted: number;
};

export type PairResponse = {
  paired: true;
  completedActivityId: string;
  plannedActivityId: string;
};

export type UnpairResponse = {
  unpaired: true;
  activityId: string;
  partnerId: string | null;
};

export type ReadinessBand = "prime" | "high" | "moderate" | "low" | "poor";
export type LoadBand = "low" | "safe" | "elevated" | "high";

export type ReadinessDriver = {
  key: "hrv" | "restingHR" | "sleep" | "load" | "exertion" | string;
  label: string;
  value: number;
  baseline: number;
  z: number;
  weight: number;
  unit?: string;
  source?: string;
  sessions?: number;
};

export type TrainingStatus = {
  date: string;
  readiness: {
    basis: string;
    score: number;
    band: ReadinessBand;
    drivers: ReadinessDriver[];
  } | null;
  readinessUnavailable:
    | "no_body_metrics"
    | "no_readings_today"
    | "insufficient_baseline"
    | null;
  load: {
    fitness: number;
    fatigue: number;
    form: number;
    ratio: number | null;
    band: LoadBand | null;
  } | null;
  loadUnavailable: "no_load_data" | "no_workouts" | null;
  projection: { date: string; ratio: number } | null;
  providerScores: {
    source: string;
    key: string;
    label: string;
    value: number;
    scale: string;
  }[];
};

export type HealthMetricsResponse = {
  days: {
    date: string;
    values: Record<string, number>;
    sources: Record<string, string>;
  }[];
  total: number;
};
