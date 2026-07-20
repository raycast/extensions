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
export type ActivityIdMappingResponse = {
  /** V2 Unique identifier for the activity */
  v2_activity_id: string;
};
export type CycleScore = {
  /** WHOOP metric of the cardiovascular load - the level of strain  on the user's cardiovascular system based on the user's heart rate during the cycle. Strain is scored on a scale from 0 to 21. */
  strain: number;
  /** Kilojoules the user expended during the cycle. */
  kilojoule: number;
  /** The user's average heart rate during the cycle. */
  average_heart_rate: number;
  /** The user's max heart rate during the cycle. */
  max_heart_rate: number;
};
export type Cycle = {
  /** Unique identifier for the physiological cycle */
  id: number;
  /** The WHOOP User for the physiological cycle */
  user_id: number;
  /** The time the cycle was recorded in WHOOP */
  created_at: string;
  /** The time the cycle was last updated in WHOOP */
  updated_at: string;
  /** Start time bound of the cycle */
  start: string;
  /** End time bound of the cycle. If not present, the user is currently in this cycle */
  end?: string;
  /** The user's timezone offset at the time the cycle was recorded. Follows format for Time Zone Designator (TZD) - '+hh:mm', '-hh:mm', or 'Z'. */
  timezone_offset: string;
  /** `SCORED` means the cycle was scored and the measurement values will be present. `PENDING_SCORE` means WHOOP is currently evaluating the cycle. `UNSCORABLE` means this activity could not be scored for some reason - commonly because there is not enough user metric data for the time range. */
  score_state: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
  score?: CycleScore;
};
export type PaginatedCycleResponse = {
  /** The collection of records in this page. */
  records?: Cycle[];
  /** A token that can be used on the next request to access the next page of records. If the token is not present, there are no more records in the collection. */
  next_token?: string;
};
export type SleepStageSummary = {
  /** Total time the user spent in bed, in milliseconds */
  total_in_bed_time_milli: number;
  /** Total time the user spent awake, in milliseconds */
  total_awake_time_milli: number;
  /** Total time WHOOP did not receive data from the user during the sleep, in milliseconds */
  total_no_data_time_milli: number;
  /** Total time the user spent in light sleep, in milliseconds */
  total_light_sleep_time_milli: number;
  /** Total time the user spent in Slow Wave Sleep (SWS), in milliseconds */
  total_slow_wave_sleep_time_milli: number;
  /** Total time the user spent in Rapid Eye Movement (REM) sleep, in milliseconds */
  total_rem_sleep_time_milli: number;
  /** Number of sleep cycles during the user's sleep */
  sleep_cycle_count: number;
  /** Number of times the user was disturbed during sleep */
  disturbance_count: number;
};
export type SleepNeeded = {
  /** The amount of sleep a user needed based on historical trends */
  baseline_milli: number;
  /** The difference between the amount of sleep the user's body required and the amount the user actually got */
  need_from_sleep_debt_milli: number;
  /** Additional sleep need accrued based on the user's strain */
  need_from_recent_strain_milli: number;
  /** Reduction in sleep need accrued based on the user's recent nap activity (negative value or zero) */
  need_from_recent_nap_milli: number;
};
export type SleepScore = {
  stage_summary: SleepStageSummary;
  sleep_needed: SleepNeeded;
  /** The user's respiratory rate during the sleep. */
  respiratory_rate?: number;
  /** A percentage (0-100%) of the time a user is asleep over the amount of sleep the user needed. May not be reported if WHOOP does not have enough data about a user yet to calculate Sleep Need. */
  sleep_performance_percentage?: number;
  /** Percentage (0-100%) of how similar this sleep and wake times compared to the previous day. May not be reported if WHOOP does not have enough sleep data about a user yet to understand consistency. */
  sleep_consistency_percentage?: number;
  /** A percentage (0-100%) of the time you spend in bed that you are actually asleep. */
  sleep_efficiency_percentage?: number;
};
export type Sleep = {
  /** Unique identifier for the sleep activity */
  id: string | number;
  /** Unique identifier for the cycle this sleep belongs to */
  cycle_id: number;
  /** Previous generation identifier for the activity. Will not exist past 09/01/2025 */
  v1_id?: number;
  /** The WHOOP User who performed the sleep activity */
  user_id: number;
  /** The time the sleep activity was recorded in WHOOP */
  created_at: string;
  /** The time the sleep activity was last updated in WHOOP */
  updated_at: string;
  /** Start time bound of the sleep */
  start: string;
  /** End time bound of the sleep */
  end: string;
  /** The user's timezone offset at the time the sleep was recorded. Follows format for Time Zone Designator (TZD) - '+hh:mm', '-hh:mm', or 'Z'. */
  timezone_offset: string;
  /** If true, this sleep activity was a nap for the user */
  nap: boolean;
  /** `SCORED` means the sleep activity was scored and the measurement values will be present. `PENDING_SCORE` means WHOOP is currently evaluating the sleep activity. `UNSCORABLE` means this activity could not be scored for some reason - commonly because there is not enough user metric data for the time range. */
  score_state: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
  score?: SleepScore;
};
export type RecoveryScore = {
  /** True if the user is still calibrating and not enough data is available in WHOOP to provide an accurate recovery. */
  user_calibrating: boolean;
  /** Percentage (0-100%) that reflects how well prepared the user's body is to take on Strain. The Recovery score is a measure of the user body's "return to baseline" after a stressor. */
  recovery_score: number;
  /** The user's resting heart rate. */
  resting_heart_rate: number;
  /** The user's Heart Rate Variability measured using Root Mean Square of Successive Differences (RMSSD), in milliseconds. */
  hrv_rmssd_milli: number;
  /** The percentage of oxygen in the user's blood. Only present if the user is on 4.0 or greater. */
  spo2_percentage?: number;
  /** The user's skin temperature, in Celsius. Only present if the user is on 4.0 or greater. */
  skin_temp_celsius?: number;
};
export type Recovery = {
  /** The Recovery represents how recovered the user is for this physiological cycle */
  cycle_id: number;
  /** ID of the Sleep associated with the Recovery */
  sleep_id: string;
  /** The WHOOP User for the recovery */
  user_id: number;
  /** The time the recovery was recorded in WHOOP */
  created_at: string;
  /** The time the recovery was last updated in WHOOP */
  updated_at: string;
  /** `SCORED` means the recovery was scored and the measurement values will be present. `PENDING_SCORE` means WHOOP is currently evaluating the cycle. `UNSCORABLE` means this activity could not be scored for some reason - commonly because there is not enough user metric data for the time range. */
  score_state: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
  score?: RecoveryScore;
};
export type RecoveryCollection = {
  /** The collection of records in this page. */
  records?: Recovery[];
  /** A token that can be used on the next request to access the next page of records. If the token is not present, there are no more records in the collection. */
  next_token?: string;
};
export type PaginatedSleepResponse = {
  /** The collection of records in this page. */
  records?: Sleep[];
  /** A token that can be used on the next request to access the next page of records. If the token is not present, there are no more records in the collection. */
  next_token?: string;
};
export type UserBodyMeasurement = {
  /** User's height in meters */
  height_meter: number;
  /** User's weight in kilograms */
  weight_kilogram: number;
  /** The max heart rate WHOOP calculated for the user */
  max_heart_rate: number;
};
export type UserBasicProfile = {
  /** The WHOOP User */
  user_id: number;
  /** User's Email */
  email: string;
  /** User's First Name */
  first_name: string;
  /** User's Last Name */
  last_name: string;
};
export type ZoneDurations = {
  /** Duration in milliseconds spent in Zone 0 (very light activity) */
  zone_zero_milli: number;
  /** Duration in milliseconds spent in Zone 1 (light activity) */
  zone_one_milli: number;
  /** Duration in milliseconds spent in Zone 2 (moderate activity) */
  zone_two_milli: number;
  /** Duration in milliseconds spent in Zone 3 (hard activity) */
  zone_three_milli: number;
  /** Duration in milliseconds spent in Zone 4 (very hard activity) */
  zone_four_milli: number;
  /** Duration in milliseconds spent in Zone 5 (maximum effort) */
  zone_five_milli: number;
};
export type WorkoutScore = {
  /** WHOOP metric of the cardiovascular load - the level of strain the workout had on the user's cardiovascular system based on the user's heart rate. Strain is scored on a scale from 0 to 21. */
  strain: number;
  /** The user's average heart rate (beats per minute) during the workout. */
  average_heart_rate: number;
  /** The user's max heart rate (beats per minute) during the workout. */
  max_heart_rate: number;
  /** Kilojoules the user expended during the workout. */
  kilojoule: number;
  /** Percentage (0-100%) of heart rate data WHOOP received during the workout. */
  percent_recorded: number;
  /** The distance the user travelled during the workout. Only present if distance data sent to WHOOP */
  distance_meter?: number;
  /** The altitude gained during the workout. This measurement does not account for downward travel - it is strictly a measure of altitude climbed. If a member climbed up and down a 1,000 meter mountain, ending at the same altitude, this measurement would be 1,000 meters. Only present if altitude data is included as part of the workout */
  altitude_gain_meter?: number;
  /** The altitude difference between the start and end points of the workout. If a member climbed up and down a mountain, ending at the same altitude, this measurement would be 0. Only present if altitude data is included as part of the workout */
  altitude_change_meter?: number;
  zone_durations: ZoneDurations;
};
export type WorkoutV2 = {
  /** Unique identifier for the workout activity */
  id: string | number;
  /** Previous generation identifier for the activity. Will not exist past 09/01/2025 */
  v1_id?: number;
  /** The WHOOP User who performed the workout */
  user_id: number;
  /** The time the workout activity was recorded in WHOOP */
  created_at: string;
  /** The time the workout activity was last updated in WHOOP */
  updated_at: string;
  /** Start time bound of the workout */
  start: string;
  /** End time bound of the workout */
  end: string;
  /** The user's timezone offset at the time the workout was recorded. Follows format for Time Zone Designator (TZD) - '+hh:mm', '-hh:mm', or 'Z'. */
  timezone_offset: string;
  /** Name of the WHOOP Sport performed during the workout */
  sport_name: string;
  /** `SCORED` means the workout activity was scored and the measurement values will be present. `PENDING_SCORE` means WHOOP is currently evaluating the workout activity. `UNSCORABLE` means this activity could not be scored for some reason - commonly because there is not enough user metric data for the time range. */
  score_state: "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
  score?: WorkoutScore;
  /** ID of the WHOOP Sport performed during the workout. Will not exist past 09/01/2025 */
  sport_id?: number;
};
export type WorkoutCollection = {
  /** The collection of records in this page. */
  records?: WorkoutV2[];
  /** A token that can be used on the next request to access the next page of records. If the token is not present, there are no more records in the collection. */
  next_token?: string;
};
/**
 * Get V2 UUID for V1 Activity ID
 *
 * Note: this endpoint remains on `/v1` (WHOOP does not currently expose a `/v2` equivalent).
 * It's only needed when you still have legacy numeric V1 activity IDs (e.g. persisted IDs or
 * responses that still include `v1_id`). Once your flow is fully V2-ID-based, this can be removed.
 */
export function getActivityMapping(activityV1Id: number | string, opts?: Oazapfts.RequestOpts) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: ActivityIdMappingResponse;
      }
    | {
        status: 404;
      }
    | {
        status: 500;
      }
  >(`/v1/activity-mapping/${encodeURIComponent(String(activityV1Id))}`, {
    ...opts,
  });
}
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
  >(`/v2/cycle/${encodeURIComponent(cycleId)}`, {
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
    `/v2/cycle${QS.query(
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
 * Get the sleep for the specified cycle ID
 */
export function getSleepForCycle(cycleId: number, opts?: Oazapfts.RequestOpts) {
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
  >(`/v2/cycle/${encodeURIComponent(cycleId)}/sleep`, {
    ...opts,
  });
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
        data: RecoveryCollection;
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
    `/v2/recovery${QS.query(
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
  >(`/v2/cycle/${encodeURIComponent(cycleId)}/recovery`, {
    ...opts,
  });
}
/**
 * Get the sleep for the specified ID
 */
export function getSleepById(sleepId: string | number, opts?: Oazapfts.RequestOpts) {
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
  >(`/v2/activity/sleep/${encodeURIComponent(String(sleepId))}`, {
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
    `/v2/activity/sleep${QS.query(
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
 * Get User Body Measurements
 */
export function getBodyMeasurement(opts?: Oazapfts.RequestOpts) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: UserBodyMeasurement;
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
  >("/v2/user/measurement/body", {
    ...opts,
  });
}
/**
 * Get Basic User Profile
 */
export function getProfileBasic(opts?: Oazapfts.RequestOpts) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: UserBasicProfile;
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
  >("/v2/user/profile/basic", {
    ...opts,
  });
}
/**
 * Revoke the access token granted by the user. If the associated OAuth client is configured to receive webhooks, it will no longer receive them for this user.
 */
export function revokeUserOAuthAccess(opts?: Oazapfts.RequestOpts) {
  return oazapfts.fetchText("/v2/user/access", {
    ...opts,
    method: "DELETE",
  });
}
/**
 * Get the workout for the specified ID
 */
export function getWorkoutById(workoutId: string | number, opts?: Oazapfts.RequestOpts) {
  return oazapfts.fetchJson<
    | {
        status: 200;
        data: WorkoutV2;
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
  >(`/v2/activity/workout/${encodeURIComponent(String(workoutId))}`, {
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
        data: WorkoutCollection;
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
    `/v2/activity/workout${QS.query(
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
