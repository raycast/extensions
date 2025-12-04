import { useFetch, showFailureToast } from "@raycast/utils";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { addDays, format } from "date-fns";
import { z } from "zod";
import type { SingleSeries } from "@/lib/types/episode";
import type { SeriesFull, SeriesLookup, RootFolder, QualityProfile, AddSeriesOptions } from "@/lib/types/series";
import type { QueueItem } from "@/lib/types/queue";
import type { WantedMissingResponse } from "@/lib/types/wanted";
import type { SystemStatus, HealthCheck, Command } from "@/lib/types/system";
import {
  SeriesLookupSchema,
  SeriesFullSchema,
  RootFolderSchema,
  QualityProfileSchema,
  SystemStatusSchema,
  CommandSchema,
} from "@/lib/types/schemas";
import { fetchAndValidate, fetchWithTimeout } from "@/lib/utils/api-helpers";

function getApiConfig() {
  const preferences = getPreferenceValues<Preferences>();
  const { host, port, base, http, apiKey } = preferences;

  const baseUrl = base ? base.replace(/^\/|\/$/g, "") : "";
  const url = `${http}://${host}:${port}${baseUrl ? `/${baseUrl}` : ""}`;

  return {
    url,
    apiKey,
    headers: {
      "X-Api-Key": apiKey,
    },
  };
}

export function useSonarrAPI<T>(endpoint: string, options?: { execute?: boolean }) {
  const { url, headers } = getApiConfig();
  const fullUrl = `${url}/api/v3${endpoint}`;

  return useFetch<T>(fullUrl, {
    headers,
    execute: options?.execute ?? true,
    onError: (error) => {
      showFailureToast("Failed to fetch data from Sonarr", { message: error.message });
    },
  });
}

export function useCalendar(futureDays: number = 14) {
  const currentDate = format(new Date(), "yyyy-MM-dd");
  const futureDate = format(addDays(new Date(), futureDays), "yyyy-MM-dd");

  return useSonarrAPI<SingleSeries[]>(
    `/calendar?start=${currentDate}&end=${futureDate}&includeSeries=true&includeEpisodeFile=true&includeEpisodeImages=true`,
  );
}

export function useSeries() {
  return useSonarrAPI<SeriesFull[]>("/series");
}

export function useQueue() {
  return useSonarrAPI<{ records: QueueItem[] }>("/queue?includeEpisode=true&includeSeries=true");
}

export function useWantedMissing(page: number = 1, pageSize: number = 50) {
  return useSonarrAPI<WantedMissingResponse>(
    `/wanted/missing?page=${page}&pageSize=${pageSize}&sortKey=airDateUtc&sortDirection=descending&includeSeries=true`,
  );
}

export function useSystemStatus() {
  return useSonarrAPI<SystemStatus>("/system/status");
}

export function useHealth() {
  return useSonarrAPI<HealthCheck[]>("/health");
}

export async function searchSeries(searchTerm: string): Promise<SeriesLookup[]> {
  const { url, headers } = getApiConfig();
  const encodedTerm = encodeURIComponent(searchTerm);

  try {
    return await fetchAndValidate(`${url}/api/v3/series/lookup?term=${encodedTerm}`, z.array(SeriesLookupSchema), {
      headers,
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to search series",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

export async function addSeries(options: AddSeriesOptions): Promise<SeriesFull> {
  const { url, headers } = getApiConfig();

  try {
    const result = await fetchAndValidate(`${url}/api/v3/series`, SeriesFullSchema, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    showToast({
      style: Toast.Style.Success,
      title: "Series added successfully",
      message: options.title,
    });

    return result;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to add series",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function removeQueueItem(id: number, blocklist: boolean = false): Promise<void> {
  const { url, headers } = getApiConfig();

  try {
    const response = await fetchWithTimeout(`${url}/api/v3/queue/${id}?blocklist=${blocklist}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    showToast({
      style: Toast.Style.Success,
      title: "Removed from queue",
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to remove from queue",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function executeCommand(command: string, body: Record<string, unknown> = {}): Promise<Command> {
  const { url, headers } = getApiConfig();

  try {
    return await fetchAndValidate(`${url}/api/v3/command`, CommandSchema, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: command,
        ...body,
      }),
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to execute command",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function searchEpisode(episodeIds: number[]): Promise<Command> {
  await showToast({
    style: Toast.Style.Animated,
    title: "Searching for episode...",
  });

  const result = await executeCommand("EpisodeSearch", { episodeIds });

  showToast({
    style: Toast.Style.Success,
    title: "Episode search started",
  });

  return result;
}

export async function searchSeason(seriesId: number, seasonNumber: number): Promise<Command> {
  await showToast({
    style: Toast.Style.Animated,
    title: "Searching for season...",
  });

  const result = await executeCommand("SeasonSearch", { seriesId, seasonNumber });

  showToast({
    style: Toast.Style.Success,
    title: "Season search started",
  });

  return result;
}

export async function toggleEpisodeMonitoring(episodeId: number, monitored: boolean): Promise<void> {
  const { url, headers } = getApiConfig();

  try {
    const response = await fetchWithTimeout(`${url}/api/v3/episode/monitor`, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        episodeIds: [episodeId],
        monitored,
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    showToast({
      style: Toast.Style.Success,
      title: monitored ? "Episode monitoring enabled" : "Episode monitoring disabled",
    });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to update monitoring",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function getRootFolders(): Promise<RootFolder[]> {
  const { url, headers } = getApiConfig();

  try {
    return await fetchAndValidate(`${url}/api/v3/rootfolder`, z.array(RootFolderSchema), { headers });
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch root folders",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

export async function getQualityProfiles(): Promise<QualityProfile[]> {
  const { url, headers } = getApiConfig();

  try {
    const profiles = await fetchAndValidate(`${url}/api/v3/qualityprofile`, z.array(QualityProfileSchema), {
      headers,
    });
    return profiles as QualityProfile[];
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch quality profiles",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

export async function testConnection(): Promise<{ success: boolean; message: string; status?: SystemStatus }> {
  const { url, headers } = getApiConfig();

  try {
    const status = await fetchAndValidate(`${url}/api/v3/system/status`, SystemStatusSchema, {
      headers,
      timeout: 15000,
      retries: 2,
    });

    return {
      success: true,
      message: `Connected to Sonarr v${status.version}`,
      status,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
