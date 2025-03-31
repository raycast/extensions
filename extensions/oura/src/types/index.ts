export interface Preference {
  unit_measurement: "metric" | "imperial";
  oura_token: string;
}

export interface WorkoutResponse {
  isLoading: boolean;
  error: Error;
  data: {
    data: [
      {
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
      },
    ];
  };
}

export interface SleepResponse {
  isLoading: boolean;
  error: Error;
  data: {
    data: [
      {
        id: string;
        contributors: {
          deep_sleep: number;
          efficiency: number;
          latency: number;
          rem_sleep: number;
          restfulness: number;
          timing: number;
          total_sleep: number;
        };
        day: string;
        score: number;
        timestamp: string;
      },
    ];
  };
}

export interface ReadinessResponse {
  isLoading: boolean;
  error: Error;
  data: {
    data: [
      {
        id: string;
        contributors: {
          activity_balance: string;
          body_temperature: string;
          hrv_balance: string;
          previous_day_activity: string;
          previous_night: string;
          recovery_index: string;
          resting_heart_rate: string;
          sleep_balance: string;
        };
        day: string;
        score: number;
        temperature_deviation: number;
        temperature_trend_deviation: number;
        timestamp: string;
      },
    ];
  };
}

export interface ActivityResponse {
  isLoading: boolean;
  error: Error;
  data: {
    data: [
      {
        id: string;
        class_5_min: string;
        score: number;
        active_calories: number;
        average_met_minutes: number;
        contributors: {
          meet_daily_targets: number;
          move_every_hour: number;
          recovery_time: number;
          stay_active: number;
          training_frequency: number;
          training_volume: number;
        };
        equivalent_walking_distance: number;
        high_activity_met_minutes: number;
        high_activity_time: number;
        inactivity_alerts: number;
        low_activity_met_minutes: number;
        low_activity_time: number;
        medium_activity_met_minutes: number;
        medium_activity_time: number;
        met: {
          interval: number;
          items: number[];
          timestamp: string;
        };
        meters_to_target: number;
        non_wear_time: number;
        resting_time: number;
        sedentary_met_minutes: number;
        sedentary_time: number;
        steps: number;
        target_calories: number;
        target_meters: number;
        total_calories: number;
        day: string;
        timestamp: string;
      },
    ];
  };
}

export interface ResilienceResponse {
  isLoading: boolean;
  error: Error;
  data: {
    data: [
      {
        id: string;
        day: string; // ISO date format
        contributors: {
          sleep_recovery: number;
          daytime_recovery: number;
          stress: number;
        };
        level: string;
      },
    ];
    next_token: string;
  };
}

export interface StressResponse {
  isLoading: boolean;
  error: Error;
  data: {
    data: [
      {
        id: string;
        day: string;
        stress_high: number;
        recovery_high: number;
        day_summary: string;
      },
    ];
    next_token: string;
  };
}
