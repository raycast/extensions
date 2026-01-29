import { BiometricData, OuraSleepData, OuraReadinessData } from "../types";

const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";

// Mock mode for testing without Oura membership
const USE_MOCK_DATA = false;

function getMockBiometrics(): BiometricData {
  // Simulate realistic daily variations
  const hour = new Date().getHours();
  const isWellRested = hour >= 6 && hour <= 14; // Better in morning/early afternoon

  return {
    sleepScore: isWellRested ? 82 : 65,
    readinessScore: isWellRested ? 78 : 52,
    hrvBalance: isWellRested ? 75 : 45,
    restingHR: isWellRested ? 58 : 68,
    date: new Date().toISOString().split("T")[0],
  };
}

async function fetchOuraData<T>(endpoint: string, token: string): Promise<T> {
  const response = await fetch(`${OURA_API_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      "Oura API Error:",
      response.status,
      response.statusText,
      errorBody,
    );

    if (response.status === 401) {
      throw new Error("Session expired. Please reconnect your Oura account.");
    }
    if (response.status === 403) {
      throw new Error(
        `Oura API access denied. Please reconnect your Oura account with required permissions.`,
      );
    }
    throw new Error(
      `Oura API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

function getDateRange(): { start: string; end: string } {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  return {
    start: formatDate(yesterday),
    end: formatDate(today),
  };
}

export async function getLatestBiometrics(
  token: string,
): Promise<BiometricData> {
  // Return mock data if enabled
  if (USE_MOCK_DATA) {
    return getMockBiometrics();
  }

  const { start, end } = getDateRange();

  const [sleepData, readinessData] = await Promise.all([
    fetchOuraData<OuraSleepData>(
      `/daily_sleep?start_date=${start}&end_date=${end}`,
      token,
    ),
    fetchOuraData<OuraReadinessData>(
      `/daily_readiness?start_date=${start}&end_date=${end}`,
      token,
    ),
  ]);

  // Get the most recent data
  const latestSleep =
    sleepData.data.length > 0
      ? sleepData.data[sleepData.data.length - 1]
      : null;
  const latestReadiness =
    readinessData.data.length > 0
      ? readinessData.data[readinessData.data.length - 1]
      : null;

  return {
    sleepScore: latestSleep?.score ?? null,
    readinessScore: latestReadiness?.score ?? null,
    hrvBalance: latestReadiness?.contributors?.hrv_balance ?? null,
    restingHR: latestReadiness?.contributors?.resting_heart_rate ?? null,
    date:
      latestReadiness?.day ??
      latestSleep?.day ??
      new Date().toISOString().split("T")[0],
  };
}
