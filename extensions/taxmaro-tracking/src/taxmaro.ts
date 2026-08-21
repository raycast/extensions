import { getPreferenceValues } from "@raycast/api";
import * as z from "zod";
import { writeCachedStatus } from "./status-cache";
import type { TrackingStatus } from "./tracking-status";

const BASE_URL = "https://app.taxmaro.com/api/v1";
const REQUEST_TIMEOUT_MS = 15_000;

interface TaxmaroPreferences {
  apiToken: string;
  colleagueId: string;
}

const preferences = getPreferenceValues<TaxmaroPreferences>();
const apiToken = preferences.apiToken.trim();
const colleagueId = preferences.colleagueId.trim();

const TrackingStatusResponse = z
  .object({
    data: z.object({
      attributes: z.object({
        today_time_tracking_details: z.object({
          duration: z.coerce.number(),
          spent_time: z.coerce.number(),
        }),
      }),
      relationships: z.object({
        running_time_tracking: z.object({
          data: z.object({}).nullable(),
        }),
      }),
    }),
  })
  .transform(({ data }): TrackingStatus => {
    const details = data.attributes.today_time_tracking_details;
    return {
      running: data.relationships.running_time_tracking.data !== null,
      closedDurationSeconds: details.duration,
      currentRunElapsedSeconds: details.spent_time,
      fetchedAt: Date.now(),
    };
  });

const request = async (path: string, init?: RequestInit): Promise<Response> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiToken}`,
      selectedColleagueId: colleagueId,
      ...init?.headers,
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Taxmaro request failed with HTTP ${response.status}.`);
  }

  return response;
};

const requestTrackingStatus = async (): Promise<TrackingStatus> => {
  const response = await request(`/loggedin_colleague_details/${colleagueId}`);
  return TrackingStatusResponse.parse(await response.json());
};

export const fetchTrackingStatus = async (): Promise<TrackingStatus> => {
  const status = await requestTrackingStatus();
  writeCachedStatus(status);
  return status;
};

const postTrackingAction = async (running: boolean): Promise<void> => {
  await request(`/colleagues/${colleagueId}/time_tracking_actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: running ? "start" : "stop" }),
  });
};

export const ensureTrackingState = async (running: boolean): Promise<void> => {
  const current = await requestTrackingStatus();
  if (current.running !== running) {
    await postTrackingAction(running);
  }
};
