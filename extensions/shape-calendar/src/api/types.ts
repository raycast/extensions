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
  source: string | null;
  externalId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type SportType =
  | "run"
  | "bike"
  | "swim"
  | "hike"
  | "yoga"
  | "nordicski"
  | "strength"
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
};

export type ListActivitiesParams = {
  from?: string;
  to?: string;
  sportType?: SportType;
  completed?: string;
  limit?: number;
  offset?: number;
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
