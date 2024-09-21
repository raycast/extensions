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
import { OAuth } from "@raycast/api";
import { getAccessToken, OAuthService } from "@raycast/utils";
import { convertDurationToSeconds, convertDistanceToMeters } from "../utils";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Strava",
  providerIcon: "strava-logo.svg",
  providerId: "strava",
  description: "Connect your Strava account",
});

let atheleteId: number | null;

export async function getAthleteId() {
  if (!atheleteId) {
    const { id } = await getAthlete();
    return id;
  }
  return atheleteId;
}

export const provider = new OAuthService({
  client,
  clientId: "124781",
  scope: "activity:read_all,activity:write",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/hjLeAV3qmZrhmII7Sm4bjHk5m8OrrL_1YzG7rKKv7cwUjlNsZ5LR0sjK52gRlpeb0Tif3S9o7E8DmnkNrTGaEXMGClw62n1zFdjRkTx5_pMFKHGq1xYOaMfdDM6yK_ifszu3GuNhbg3Hfqw",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/GuE1UIOPMgI45ggO4L9XpdJ_p1gdetpxgHOMW83t6mlfMY4oiYYsygs5KoKXiJMAhlC56oS97-7qQYmyEWa8uTEtJ6opJb7n_o_fuyHsXBm6XgcPyB-gTh_U7zKFEuXzbo71d49zrRE",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/EaTy-0vwWWAotlvoRJ21wmShjVvTAOqSM_4_OQt6KkBiF7kk_nHuPO6934OFPnyORYUXSHofI1D1NgkvpamILRAw26kPZdNEmeD2bTwqmywTjyEhI9gGVB4yzn3rcW0203MWqaPqAJs",
  extraParameters: { grant_type: "refresh_token" },
  async onAuthorize() {
    const { id } = await getAthlete();
    atheleteId = id;
  },
});

const ACTIVITY_ENDPOINT = "https://www.strava.com/api/v3/";

export const PAGE_SIZE = 30;

export const getAthlete = async () => {
  try {
    const { token } = await getAccessToken();
    const response = await fetch(`https://www.strava.com/api/v3/athlete?access_token=${token}`);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      throw new Error("HTTP error " + response.status);
    }
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaAthlete;
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getAthlete Error:", err);
    throw new Error(error);
  }
};

export const getActivities = async (page = 1, pageSize = PAGE_SIZE, after?: number) => {
  try {
    const { token } = await getAccessToken();
    const athleteId = await getAthleteId();
    const response = await fetch(
      `https://www.strava.com/api/v3/athletes/${athleteId}/activities?page=${page}&per_page=${pageSize}${after ? `&after=${after}` : ""}&access_token=${token}`,
    );
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      throw new Error("HTTP error " + response.status);
    }
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaActivitySummary[];
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getActivities Error:", err);
    throw new Error(error);
  }
};

export const getActivity = async (id: number) => {
  try {
    const { token } = await getAccessToken();
    const response = await fetch(`${ACTIVITY_ENDPOINT}/activities/${String(id)}?access_token=${token}`);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      throw new Error("HTTP error " + response.status);
    }
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaActivity;
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getActivity Error:", err);
    throw new Error(error);
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
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      throw new Error("HTTP error " + response.status);
    }
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaStats;
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getStats Error:", err);
    throw new Error(error);
  }
};

export const getClubs = async (page = 1, pageSize = PAGE_SIZE) => {
  try {
    const { token } = await getAccessToken();
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/clubs?page=${page}&per_page=${pageSize}&access_token=${token}`,
    );
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      throw new Error("HTTP error " + response.status);
    }
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaSummaryClub[];
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getClubs Error:", err);
    throw new Error(error);
  }
};

export const getClubActivities = async (clubId: string, page = 1, pageSize = PAGE_SIZE, after?: number) => {
  try {
    const { token } = await getAccessToken();
    const response = await fetch(
      `https://www.strava.com/api/v3/clubs/${clubId}/activities?page=${page}&per_page=${pageSize}&after=${after}&access_token=${token}`,
    );
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      throw new Error("HTTP error " + response.status);
    }
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaClubActivity[];
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getClubActivities Error:", err);
    throw new Error(error);
  }
};

export const getRoutes = async (page = 1, pageSize = PAGE_SIZE) => {
  try {
    const { token } = await getAccessToken();
    const athleteId = await getAthleteId();
    const response = await fetch(
      `https://www.strava.com/api/v3/athletes/${athleteId}/routes?page=${page}&per_page=${pageSize}&access_token=${token}`,
    );
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      throw new Error("HTTP error " + response.status);
    }
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    return json as StravaRoute[];
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("getRoutes Error:", err);
    throw new Error(error);
  }
};

export const exportRoute = async (routeId_str: string, fileType: "gpx" | "tcx") => {
  try {
    const { token } = await getAccessToken();
    const response = await fetch(
      `https://www.strava.com/api/v3/routes/${routeId_str}/export_${fileType}?access_token=${token}`,
    );
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded");
      }
      throw new Error("HTTP error " + response.status);
    }
    return response.body;
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    console.error("exportRoute Error:", err);
    throw new Error(error);
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
    const json = await response.json();
    if ((json as Error).message) {
      throw new Error((json as Error).message);
    }
    const activity = json as StravaActivitySummary;
    return activity;
  } catch (err) {
    const error = err instanceof Error ? err.message : "An error occurred";
    throw new Error(error);
  }
};
