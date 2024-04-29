export type StravaAthlete = {
  id: number;
  username: string;
  resource_state: number;
  firstname: string;
  lastname: string;
  city: string;
  state: string;
  country: string;
};

export enum ActivityType {
  AlpineSki = "AlpineSki",
  BackcountrySki = "BackcountrySki",
  Canoeing = "Canoeing",
  Crossfit = "Crossfit",
  EBikeRide = "EBikeRide",
  Elliptical = "Elliptical",
  Hike = "Hike",
  IceSkate = "IceSkate",
  InlineSkate = "InlineSkate",
  Kayaking = "Kayaking",
  Kitesurf = "Kitesurf",
  NordicSki = "NordicSki",
  Ride = "Ride",
  RockClimbing = "RockClimbing",
  RollerSki = "RollerSki",
  Rowing = "Rowing",
  Run = "Run",
  Snowboard = "Snowboard",
  Snowshoe = "Snowshoe",
  StairStepper = "StairStepper",
  StandUpPaddling = "StandUpPaddling",
  Surfing = "Surfing",
  Swim = "Swim",
  VirtualRide = "VirtualRide",
  Walk = "Walk",
  WeightTraining = "WeightTraining",
  Windsurf = "Windsurf",
  Workout = "Workout",
  Yoga = "Yoga",
}

export type StravaActivitySummary = {
  name: string;
  description: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: ActivityType;
  id: number;
  start_date: string;
  start_date_local: string;
  map: {
    summary_polyline: string;
  };
  average_speed: number;
  max_speed: number;
  average_cadence: number;
  has_heartrate: boolean;
  average_heartrate: number;
  max_heartrate: number;
  suffer_score: number;
  average_watts: number;
  max_watts: number;
  weighted_average_watts: number;
  kilojoules: number;
  elev_high: number;
  elev_low: number;
  trainer: boolean;
  commute: boolean;
  photo_count: number;
};

export type StravaActivity = StravaActivitySummary & {
  photos: {
    count: number;
    primary: {
      id: number;
      source: number;
      unique_id: string;
      urls: {
        100: string;
        600: string;
      };
    };
  };
  gear: {
    id: string;
    primary: boolean;
    name: string;
    distance: number;
  };
  calories: number;
  device_name: string;
  splits_metric: {
    distance: number;
    elapsed_time: number;
    elevation_difference: number;
    moving_time: number;
    pace_zone: number;
    average_speed: number;
  }[];
  splits_standard: {
    distance: number;
    elapsed_time: number;
    elevation_difference: number;
    moving_time: number;
    pace_zone: number;
    average_speed: number;
  }[];
  laps: {
    average_cadence: number;
    average_heartrate: number;
    average_speed: number;
    distance: number;
    elapsed_time: number;
    max_heartrate: number;
    max_speed: number;
    moving_time: number;
    split: number;
  }[];
};

type Totals = {
  distance: number;
  achievement_count: number;
  count: number;
  elapsed_time: number;
  elevation_gain: number;
  moving_time: number;
};

export type StravaStats = {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
  recent_run_totals: Totals;
  all_run_totals: Totals;
  recent_swim_totals: Totals;
  ytd_swim_totals: Totals;
  all_swim_totals: Totals;
  recent_ride_totals: Totals;
  ytd_ride_totals: Totals;
  all_ride_totals: Totals;
  ytd_run_totals: Totals;
};
