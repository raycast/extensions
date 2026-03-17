import { getPreferenceValues } from "@raycast/api";
import {
  StatsResponse,
  FeedResponse,
  GameDetails,
  DuelDetails,
  ProfileResponse,
  DailyChallengeResponse,
  MyDailyChallengeScore,
} from "../types";

const BASE_URL = "https://www.geoguessr.com/api";
const GAME_SERVER_URL = "https://game-server.geoguessr.com/api";

export async function apiRequest<T>(endpoint: string): Promise<T> {
  const { ncfaToken } = getPreferenceValues<Preferences>();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      Cookie: `_ncfa=${ncfaToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  return json as T;
}

// API functions
export async function getProfile(): Promise<ProfileResponse> {
  return apiRequest("/v3/profiles");
}

export async function getProfileStats(): Promise<StatsResponse> {
  return apiRequest<StatsResponse>("/v3/profiles/stats");
}

export async function getDailyChallenge(): Promise<DailyChallengeResponse> {
  return apiRequest("/v3/challenges/daily-challenges/today");
}

export async function getMyDailyChallengeScore(): Promise<MyDailyChallengeScore> {
  return apiRequest("/v3/challenges/daily-challenges/me");
}

export async function getFeed(count = 10, page = 0): Promise<FeedResponse> {
  return apiRequest(`/v4/feed/private?count=${count}&page=${page}`);
}

export async function getPreviousDailyChallenge(): Promise<DailyChallengeResponse> {
  return apiRequest("/v3/challenges/daily-challenges/previous");
}

export async function getRecentGames(count = 10): Promise<FeedResponse> {
  return apiRequest<FeedResponse>(`/v4/feed/private?count=${count}&page=0`);
}

export async function getGameDetails(token: string): Promise<GameDetails> {
  return apiRequest(`/v3/games/${token}`);
}

export async function getChallengeDetails(token: string): Promise<GameDetails> {
  return apiRequest(`/v3/challenges/${token}`);
}

export async function getDuelDetails(gameId: string): Promise<DuelDetails> {
  const { ncfaToken } = getPreferenceValues<Preferences>();

  const response = await fetch(`${GAME_SERVER_URL}/duels/${gameId}`, {
    headers: {
      Cookie: `_ncfa=${ncfaToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  return json as DuelDetails;
}
