import { OAuth, LocalStorage, getPreferenceValues } from "@raycast/api";

// Withings OAuth Configuration
// Registered at: https://developer.withings.com/dashboard/
// Redirect URI: https://raycast.com/redirect?packageName=Extension
//
// IMPORTANT: Users must register their own Withings OAuth app and configure in preferences
// See README.md for setup instructions
const preferences = getPreferenceValues<Preferences>();
const WITHINGS_CLIENT_ID = preferences.withingsClientId;
const WITHINGS_CLIENT_SECRET = preferences.withingsClientSecret;
const WITHINGS_REDIRECT_URI =
  "https://raycast.com/redirect?packageName=Extension";

export const withingsOAuthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Withings",
  providerIcon: "command-icon.png",
  providerId: "withings",
  description: "Connect your Withings account",
});

export interface WithingsTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id: string;
}

export interface WithingsMeasurement {
  date: Date;
  weight?: number;
  fatFreeMass?: number;
  fatRatio?: number;
  fatMassWeight?: number;
  diastolicBloodPressure?: number;
  systolicBloodPressure?: number;
  heartPulse?: number;
  boneMass?: number;
  muscleMass?: number;
  hydration?: number;
}

interface WithingsAPIResponse {
  status: number;
  body: {
    updatetime: number;
    timezone: string;
    measuregrps: Array<{
      grpid: number;
      attrib: number;
      date: number;
      created: number;
      category: number;
      deviceid: string;
      measures: Array<{
        value: number;
        type: number;
        unit: number;
      }>;
    }>;
  };
}

const MEASUREMENT_TYPES = {
  WEIGHT: 1,
  FAT_FREE_MASS: 5,
  FAT_RATIO: 6,
  FAT_MASS_WEIGHT: 8,
  DIASTOLIC_BP: 9,
  SYSTOLIC_BP: 10,
  HEART_PULSE: 11,
  HYDRATION: 77,
  BONE_MASS: 88,
  MUSCLE_MASS: 76,
};

export async function authorize(): Promise<void> {
  const authRequest = await withingsOAuthClient.authorizationRequest({
    endpoint: "https://account.withings.com/oauth2_user/authorize2",
    clientId: WITHINGS_CLIENT_ID,
    scope: "user.metrics",
    extraParameters: {
      response_type: "code",
    },
  });

  const { authorizationCode } =
    await withingsOAuthClient.authorize(authRequest);

  const tokens = await fetchTokens(authorizationCode);
  await storeTokens(tokens);
}

async function fetchTokens(authCode: string): Promise<WithingsTokens> {
  const params = new URLSearchParams({
    action: "requesttoken",
    grant_type: "authorization_code",
    client_id: WITHINGS_CLIENT_ID,
    client_secret: WITHINGS_CLIENT_SECRET,
    code: authCode,
    redirect_uri: WITHINGS_REDIRECT_URI,
  });

  const response = await fetch("https://wbsapi.withings.net/v2/oauth2", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = (await response.json()) as {
    status: number;
    body: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      userid: string;
    };
  };

  if (data.status !== 0) {
    throw new Error("Failed to fetch tokens from Withings");
  }

  return {
    access_token: data.body.access_token,
    refresh_token: data.body.refresh_token,
    expires_at: Date.now() + data.body.expires_in * 1000,
    user_id: data.body.userid,
  };
}

async function refreshTokens(refreshToken: string): Promise<WithingsTokens> {
  const params = new URLSearchParams({
    action: "requesttoken",
    grant_type: "refresh_token",
    client_id: WITHINGS_CLIENT_ID,
    client_secret: WITHINGS_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const response = await fetch("https://wbsapi.withings.net/v2/oauth2", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = (await response.json()) as {
    status: number;
    body: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      userid: string;
    };
  };

  if (data.status !== 0) {
    throw new Error("Failed to refresh tokens");
  }

  return {
    access_token: data.body.access_token,
    refresh_token: data.body.refresh_token,
    expires_at: Date.now() + data.body.expires_in * 1000,
    user_id: data.body.userid,
  };
}

async function storeTokens(tokens: WithingsTokens): Promise<void> {
  await LocalStorage.setItem("withings_tokens", JSON.stringify(tokens));
}

export async function getValidTokens(): Promise<WithingsTokens | null> {
  const tokensString = await LocalStorage.getItem<string>("withings_tokens");
  if (!tokensString) {
    return null;
  }

  const tokens: WithingsTokens = JSON.parse(tokensString);

  // Check if tokens are expired
  if (Date.now() >= tokens.expires_at - 300000) {
    // Refresh 5 minutes before expiry
    const newTokens = await refreshTokens(tokens.refresh_token);
    await storeTokens(newTokens);
    return newTokens;
  }

  return tokens;
}

export async function getMeasurements(
  fromDate?: Date,
  toDate?: Date,
): Promise<WithingsMeasurement[]> {
  const tokens = await getValidTokens();
  if (!tokens) {
    throw new Error("Not authenticated. Please configure Withings first.");
  }

  // Get lookback days from preferences
  const prefs = getPreferenceValues<Preferences>();
  const lookbackDays = parseInt(prefs.lookbackDays || "7", 10);
  const validLookbackDays =
    isNaN(lookbackDays) || lookbackDays < 1 ? 7 : lookbackDays;

  const startDate =
    fromDate || new Date(Date.now() - validLookbackDays * 24 * 60 * 60 * 1000);
  const endDate = toDate || new Date();

  const params = new URLSearchParams({
    action: "getmeas",
    access_token: tokens.access_token,
    startdate: Math.floor(startDate.getTime() / 1000).toString(),
    enddate: Math.floor(endDate.getTime() / 1000).toString(),
  });

  const response = await fetch(
    `https://wbsapi.withings.net/measure?${params.toString()}`,
  );
  const data = (await response.json()) as WithingsAPIResponse;

  if (data.status !== 0) {
    throw new Error(`Withings API error: ${data.status}`);
  }

  // Group measurements by date
  const measurementsByDate = new Map<number, WithingsMeasurement>();

  for (const group of data.body.measuregrps) {
    const groupDate = group.date;
    let measurement = measurementsByDate.get(groupDate);

    if (!measurement) {
      measurement = {
        date: new Date(groupDate * 1000),
      };
      measurementsByDate.set(groupDate, measurement);
    }

    for (const measure of group.measures) {
      const value = measure.value * Math.pow(10, measure.unit);

      switch (measure.type) {
        case MEASUREMENT_TYPES.WEIGHT:
          measurement.weight = value;
          break;
        case MEASUREMENT_TYPES.FAT_FREE_MASS:
          measurement.fatFreeMass = value;
          break;
        case MEASUREMENT_TYPES.FAT_RATIO:
          measurement.fatRatio = value;
          break;
        case MEASUREMENT_TYPES.FAT_MASS_WEIGHT:
          measurement.fatMassWeight = value;
          break;
        case MEASUREMENT_TYPES.DIASTOLIC_BP:
          measurement.diastolicBloodPressure = value;
          break;
        case MEASUREMENT_TYPES.SYSTOLIC_BP:
          measurement.systolicBloodPressure = value;
          break;
        case MEASUREMENT_TYPES.HEART_PULSE:
          measurement.heartPulse = value;
          break;
        case MEASUREMENT_TYPES.HYDRATION:
          measurement.hydration = value;
          break;
        case MEASUREMENT_TYPES.BONE_MASS:
          measurement.boneMass = value;
          break;
        case MEASUREMENT_TYPES.MUSCLE_MASS:
          measurement.muscleMass = value;
          break;
      }
    }
  }

  return Array.from(measurementsByDate.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
}

export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getValidTokens();
  return tokens !== null;
}

export async function logout(): Promise<void> {
  await LocalStorage.removeItem("withings_tokens");
}
