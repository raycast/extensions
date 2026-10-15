import fetch from "node-fetch";
import {
  StravaActivity,
  StravaActivitySummary,
  StravaAthlete,
  StravaClubActivity,
  StravaStats,
  StravaSummaryClub,
  StravaManualActivity,
  StravaRoute,
} from "./types";
import { getAccessToken } from "@raycast/utils";
import { convertDurationToSeconds, convertDistanceToMeters } from "../utils";

// Fetch athlete data inside command hooks, where API errors can be recovered.
let athleteId: number | null = null;

export async function getAthleteId() {
  if (!athleteId) {
    const { id } = await getAthlete();
    athleteId = id;
  }
  return athleteId;
}

export { provider } from "./auth";

const ACTIVITY_ENDPOINT = "https://www.strava.com/api/v3";

function checkResponse(response: { ok: boolean; status: number }) {
  if (response.ok) return;
  switch (response.status) {
    case 401:
      throw new Error("Strava authorization has expired. Reconnect your Strava account in extension preferences.");
    case 402:
    case 403:
      throw new Error(
        "Strava denied access for your personal app. Check the app's status and permissions in Strava API Settings, then reconnect in Workouts settings.",
      );
    case 429:
      throw new Error("Strava's rate limit was reached. Please try again later.");
    default:
      throw new Error(`Strava is unavailable (HTTP ${response.status}). Please try again later.`);
  }
}

export const PAGE_SIZE = 30;

export const getAthlete = async () => {
  try {
    const { token } = await getAccessToken();
    const response = await fetch(`https://www.strava.com/api/v3/athlete?access_token=${token}`);
    checkResponse(response);
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaAthlete;
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getAthlete Error:", err);
    throw err instanceof Error ? err : new Error(error);
  }
};

export const getActivities = async (page = 1, pageSize = PAGE_SIZE, after?: number) => {
  try {
    const { token } = await getAccessToken();
    const athleteId = await getAthleteId();
    const response = await fetch(
      `https://www.strava.com/api/v3/athletes/${athleteId}/activities?page=${page}&per_page=${pageSize}${after ? `&after=${after}` : ""}&access_token=${token}`,
    );
    checkResponse(response);
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaActivitySummary[];
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getActivities Error:", err);
    throw err instanceof Error ? err : new Error(error);
  }
};

export const getActivity = async (id: number) => {
  try {
    const { token } = await getAccessToken();
    const response = await fetch(`${ACTIVITY_ENDPOINT}/activities/${String(id)}?access_token=${token}`);
    checkResponse(response);
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaActivity;
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getActivity Error:", err);
    throw err instanceof Error ? err : new Error(error);
  }
};

export const getStats = async () => {
  try {
    const { token } = await getAccessToken();
    const athleteId = await getAthleteId();
    const response = await fetch(`https://www.strava.com/api/v3/athletes/${athleteId}/stats`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
    });
    checkResponse(response);
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaStats;
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getStats Error:", err);
    throw err instanceof Error ? err : new Error(error);
  }
};

export const getClubs = async (page = 1, pageSize = PAGE_SIZE) => {
  try {
    const { token } = await getAccessToken();
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/clubs?page=${page}&per_page=${pageSize}&access_token=${token}`,
    );
    checkResponse(response);
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaSummaryClub[];
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getClubs Error:", err);
    throw err instanceof Error ? err : new Error(error);
  }
};

export const getClubActivities = async (clubId: string, page = 1, pageSize = PAGE_SIZE, after?: number) => {
  try {
    const { token } = await getAccessToken();
    const response = await fetch(
      `https://www.strava.com/api/v3/clubs/${clubId}/activities?page=${page}&per_page=${pageSize}&after=${after}&access_token=${token}`,
    );
    checkResponse(response);
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaClubActivity[];
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getClubActivities Error:", err);
    throw err instanceof Error ? err : new Error(error);
  }
};

export const getRoutes = async (page = 1, pageSize = PAGE_SIZE) => {
  try {
    const { token } = await getAccessToken();
    const athleteId = await getAthleteId();
    const response = await fetch(
      `https://www.strava.com/api/v3/athletes/${athleteId}/routes?page=${page}&per_page=${pageSize}&access_token=${token}`,
    );
    checkResponse(response);
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaRoute[];
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getRoutes Error:", err);
    throw err instanceof Error ? err : new Error(error);
  }
};

export const exportRoute = async (routeId_str: string, fileType: "gpx" | "tcx") => {
  try {
    const { token } = await getAccessToken();
    const response = await fetch(
      `https://www.strava.com/api/v3/routes/${routeId_str}/export_${fileType}?access_token=${token}`,
    );
    checkResponse(response);
    return response.body;
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("exportRoute Error:", err);
    throw err instanceof Error ? err : new Error(error);
  }
};

export const createActivity = async (activityValues: StravaManualActivity) => {
  const isTrainer = activityValues.isTrainer ? 1 : 0;
  const isCommute = activityValues.isCommute ? 1 : 0;

  try {
    const { token } = await getAccessToken();
    const response = await fetch("https://www.strava.com/api/v3/activities", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: activityValues.name,
        sport_type: activityValues.sportType,
        start_date_local: activityValues.date,
        elapsed_time: convertDurationToSeconds(activityValues.duration),
        description: activityValues.description,
        distance: convertDistanceToMeters(activityValues.distance, activityValues.distanceUnit),
        trainer: isTrainer,
        commute: isCommute,
      }),
    });
    checkResponse(response);
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    const activity = json as StravaActivitySummary;
    return activity;
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    throw err instanceof Error ? err : new Error(error);
  }
};
