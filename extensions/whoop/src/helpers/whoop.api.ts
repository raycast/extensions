/**
 * WHOOP API
 * DO NOT MODIFY - This file has been generated using oazapfts.
 * See https://www.npmjs.com/package/oazapfts
 */
import * as Oazapfts from "oazapfts/lib/runtime";
import * as QS from "oazapfts/lib/runtime/query";
export const defaults: Oazapfts.RequestOpts = {
  baseUrl: "https://api.prod.whoop.com/developer",
};
const oazapfts = Oazapfts.runtime(defaults);
export const servers = {
  server1: "https://api.prod.whoop.com/developer",
};
export type CycleScore = {
  strain: number;
  kilojoule: number;
  average_heart_rate: number;
  max_heart_rate: number;
};
export type Cycle = {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end?: string;
  timezone_offset: string;
  score_state: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
  score?: CycleScore;
};
export type PaginatedCycleResponse = {
  records?: Cycle[];
  next_token?: string;
};
export type RecoveryScore = {
  user_calibrating: boolean;
  recovery_score: number;
  resting_heart_rate: number;
  hrv_rmssd_milli: number;
  spo2_percentage?: number;
  skin_temp_celsius?: number;
};
export type Recovery = {
  cycle_id: number;
  sleep_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
  score?: RecoveryScore;
};
export type PaginatedRecoveryResponse = {
  records?: Recovery[];
  next_token?: string;
};
export type SleepStageSummary = {
  total_in_bed_time_milli: number;
  total_awake_time_milli: number;
  total_no_data_time_milli: number;
  total_light_sleep_time_milli: number;
  total_slow_wave_sleep_time_milli: number;
  total_rem_sleep_time_milli: number;
  sleep_cycle_count: number;
  disturbance_count: number;
};
export type SleepNeeded = {
  baseline_milli: number;
  need_from_sleep_debt_milli: number;
  need_from_recent_strain_milli: number;
  need_from_recent_nap_milli: number;
};
export type SleepScore = {
  stage_summary: SleepStageSummary;
  sleep_needed: SleepNeeded;
  respiratory_rate?: number;
  sleep_performance_percentage?: number;
  sleep_consistency_percentage?: number;
  sleep_efficiency_percentage?: number;
};
export type Sleep = {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  nap: boolean;
  score_state: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
  score?: SleepScore;
};
export type PaginatedSleepResponse = {
  records?: Sleep[];
  next_token?: string;
};
export type UserBodyMeasurement = {
  height_meter: number;
  weight_kilogram: number;
  max_heart_rate: number;
};
export type UserBasicProfile = {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
};
export type ZoneDuration = {
  zone_zero_milli?: number;
  zone_one_milli?: number;
  zone_two_milli?: number;
  zone_three_milli?: number;
  zone_four_milli?: number;
  zone_five_milli?: number;
};
export type WorkoutScore = {
  strain: number;
  average_heart_rate: number;
  max_heart_rate: number;
  kilojoule: number;
  percent_recorded: number;
  distance_meter?: number;
  altitude_gain_meter?: number;
  altitude_change_meter?: number;
  zone_duration: ZoneDuration;
};
export type Workout = {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  sport_id: number;
  score_state: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
  score?: WorkoutScore;
};
export type PaginatedWorkoutResponse = {
  records?: Workout[];
  next_token?: string;
};
/**
 * Get the cycle for the specified ID
 */
export function getCycleById(cycleId: number, opts?: Oazapfts.RequestOpts) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: Cycle;
      }
    | {
        status: 400;
      }
    | {
        status: 401;
      }
    | {
        status: 404;
      }
    | {
        status: 429;
      }
    | {
        status: 500;
      }
  >(`/v1/cycle/${encodeURIComponent(cycleId)}`, {
    ...opts,
  });
}
/**
 * Get all physiological cycles for a user, paginated. Results are sorted by start time in descending order.
 */
export function getCycleCollection(
  {
    limit,
    start,
    end,
    nextToken,
  }: {
    limit?: number;
    start?: string;
    end?: string;
    nextToken?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: PaginatedCycleResponse;
      }
    | {
        status: 400;
      }
    | {
        status: 401;
      }
    | {
        status: 429;
      }
    | {
        status: 500;
      }
  >(
    `/v1/cycle${QS.query(
      QS.explode({
        limit,
        start,
        end,
        nextToken,
      }),
    )}`,
    {
      ...opts,
    },
  );
}
/**
 * Get all recoveries for a user, paginated. Results are sorted by start time of the related sleep in descending order.
 */
export function getRecoveryCollection(
  {
    limit,
    start,
    end,
    nextToken,
  }: {
    limit?: number;
    start?: string;
    end?: string;
    nextToken?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: PaginatedRecoveryResponse;
      }
    | {
        status: 400;
      }
    | {
        status: 401;
      }
    | {
        status: 429;
      }
    | {
        status: 500;
      }
  >(
    `/v1/recovery${QS.query(
      QS.explode({
        limit,
        start,
        end,
        nextToken,
      }),
    )}`,
    {
      ...opts,
    },
  );
}
/**
 * Get the recovery for a cycle
 */
export function getRecoveryForCycle(cycleId: number, opts?: Oazapfts.RequestOpts) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: Recovery;
      }
    | {
        status: 400;
      }
    | {
        status: 401;
      }
    | {
        status: 404;
      }
    | {
        status: 429;
      }
    | {
        status: 500;
      }
  >(`/v1/cycle/${encodeURIComponent(cycleId)}/recovery`, {
    ...opts,
  });
}
/**
 * Get the sleep for the specified ID
 */
export function getSleepById(sleepId: number, opts?: Oazapfts.RequestOpts) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: Sleep;
      }
    | {
        status: 400;
      }
    | {
        status: 401;
      }
    | {
        status: 404;
      }
    | {
        status: 429;
      }
    | {
        status: 500;
      }
  >(`/v1/activity/sleep/${encodeURIComponent(sleepId)}`, {
    ...opts,
  });
}
/**
 * Get all sleeps for a user, paginated. Results are sorted by start time in descending order.
 */
export function getSleepCollection(
  {
    limit,
    start,
    end,
    nextToken,
  }: {
    limit?: number;
    start?: string;
    end?: string;
    nextToken?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: PaginatedSleepResponse;
      }
    | {
        status: 400;
      }
    | {
        status: 401;
      }
    | {
        status: 429;
      }
    | {
        status: 500;
      }
  >(
    `/v1/activity/sleep${QS.query(
      QS.explode({
        limit,
        start,
        end,
        nextToken,
      }),
    )}`,
    {
      ...opts,
    },
  );
}
/**
 * Get the user's body measurements
 */
export function getBodyMeasurement(opts?: Oazapfts.RequestOpts) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: UserBodyMeasurement;
      }
    | {
        status: 400;
      }
    | {
        status: 401;
      }
    | {
        status: 429;
      }
    | {
        status: 500;
      }
  >("/v1/user/measurement/body", {
    ...opts,
  });
}
/**
 * Get the user's Basic Profile
 */
export function getProfileBasic(opts?: Oazapfts.RequestOpts) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: UserBasicProfile;
      }
    | {
        status: 400;
      }
    | {
        status: 401;
      }
    | {
        status: 429;
      }
    | {
        status: 500;
      }
  >("/v1/user/profile/basic", {
    ...opts,
  });
}
/**
 * Revoke the access token granted by the user. If the associated OAuth client is configured to receive webhooks, it will no longer receive them for this user.
 */
export function revokeUserOAuthAccess(opts?: Oazapfts.RequestOpts) {
  return oazapfts.fetchText("/v1/user/access", {
    ...opts,
    method: "DELETE",
  });
}
/**
 * Get the workout for the specified ID
 */
export function getWorkoutById(workoutId: number, opts?: Oazapfts.RequestOpts) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: Workout;
      }
    | {
        status: 400;
      }
    | {
        status: 401;
      }
    | {
        status: 404;
      }
    | {
        status: 429;
      }
    | {
        status: 500;
      }
  >(`/v1/activity/workout/${encodeURIComponent(workoutId)}`, {
    ...opts,
  });
}
/**
 * Get all workouts for a user, paginated. Results are sorted by start time in descending order.
 */
export function getWorkoutCollection(
  {
    limit,
    start,
    end,
    nextToken,
  }: {
    limit?: number;
    start?: string;
    end?: string;
    nextToken?: string;
  } = {},
  opts?: Oazapfts.RequestOpts,
) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: PaginatedWorkoutResponse;
      }
    | {
        status: 400;
      }
    | {
        status: 401;
      }
    | {
        status: 429;
      }
    | {
        status: 500;
      }
  >(
    `/v1/activity/workout${QS.query(
      QS.explode({
        limit,
        start,
        end,
        nextToken,
      }),
    )}`,
    {
      ...opts,
    },
  );
}
