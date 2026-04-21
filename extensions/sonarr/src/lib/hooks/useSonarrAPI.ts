import { useFetch, showFailureToast } from "@raycast/utils";
import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { addDays, format } from "date-fns";
import { z } from "zod";
import type { SingleSeries } from "@/lib/types/episode";
import type { BlocklistResponse } from "@/lib/types/blocklist";
import type { HistoryResponse } from "@/lib/types/history";
import type { SonarrPreferences } from "@/lib/types/preferences";
import type { QueueItem } from "@/lib/types/queue";
import type { AddSeriesOptions, QualityProfile, RootFolder, SeriesFull, SeriesLookup } from "@/lib/types/series";
import type { Command, HealthCheck, SystemStatus } from "@/lib/types/system";
import type { WantedMissingResponse } from "@/lib/types/wanted";
import {
  CommandSchema,
  QualityProfileSchema,
  RootFolderSchema,
  SeriesFullSchema,
  SeriesLookupSchema,
  SystemStatusSchema,
} from "@/lib/types/schemas";
import { fetchAndValidate, fetchWithTimeout } from "@/lib/utils/api-helpers";

function getApiConfig() {
  const preferences = getPreferenceValues<SonarrPreferences>();
  const rawHost = preferences.host.trim();
  const rawPort = preferences.port.trim();
  const rawBase = preferences.base.trim();
  const apiKey = preferences.apiKey.trim();

  let protocol = preferences.http;
  let host = rawHost;
  let port = rawPort;
  let baseFromHost = "";

  if (/^https?:\/\//i.test(rawHost)) {
    try {
      const parsed = new URL(rawHost);
      protocol = parsed.protocol.replace(":", "") as "http" | "https";
      host = parsed.hostname;
      port = parsed.port || rawPort;
      baseFromHost = parsed.pathname === "/" ? "" : parsed.pathname;
    } catch {
      // Keep original values and let the request fail with a clear error.
    }
  } else {
    const slashIndex = host.indexOf("/");

    if (slashIndex !== -1) {
      baseFromHost = host.slice(slashIndex + 1);
      host = host.slice(0, slashIndex);
    }

    const hostPortMatch = host.match(/^(.+):(\d+)$/);
    if (hostPortMatch) {
      host = hostPortMatch[1];
      port = hostPortMatch[2];
    }
  }

  host = host.replace(/\/+$/g, "");
  const basePath = (rawBase || baseFromHost).replace(/^\/|\/$/g, "");

  const url = `${protocol}://${host}${port ? `:${port}` : ""}${basePath ? `/${basePath}` : ""}`;

  return {
    url,
    headers: {
      "X-Api-Key": apiKey,
    },
  };
}

function getErrorMessageFromPayload(payload: unknown): string | undefined {
  if (typeof payload === "string") {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.message === "string") {
    return record.message;
  }

  if (typeof record.error === "string") {
    return record.error;
  }

  return undefined;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

function getApiError(status: number, payload: unknown): Error {
  const message = getErrorMessageFromPayload(payload);
  return new Error(message ? `API returned ${status}: ${message}` : `API returned ${status}`);
}

export function useSonarrAPI<T>(endpoint: string, options?: { execute?: boolean }) {
  const { url, headers } = getApiConfig();
  const fullUrl = `${url}/api/v3${endpoint}`;

  return useFetch<T>(fullUrl, {
    headers,
    execute: options?.execute ?? true,
    keepPreviousData: true,
    parseResponse: async (response) => {
      const payload = await parseResponsePayload(response);

      if (!response.ok) {
        throw getApiError(response.status, payload);
      }

      return payload as T;
    },
    onError: (error) => {
      showFailureToast(error, {
        title: "Failed to fetch data from Sonarr",
        primaryAction: {
          title: "Open Extension Preferences",
          onAction: openExtensionPreferences,
        },
      });
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

export function useHistory(page: number = 1, pageSize: number = 100) {
  return useSonarrAPI<HistoryResponse>(
    `/history?page=${page}&pageSize=${pageSize}&sortKey=date&sortDirection=descending&includeSeries=true&includeEpisode=true`,
  );
}

export function useBlocklist(page: number = 1, pageSize: number = 100) {
  return useSonarrAPI<BlocklistResponse>(
    `/blocklist?page=${page}&pageSize=${pageSize}&sortKey=date&sortDirection=descending&includeSeries=true`,
  );
}

export function useCommands() {
  return useSonarrAPI<Command[]>("/command");
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
      const payload = await parseResponsePayload(response);
      throw getApiError(response.status, payload);
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

  const response = await fetchWithTimeout(`${url}/api/v3/command`, {
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

  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw getApiError(response.status, payload);
  }

  const parsed = CommandSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error("Sonarr returned an unexpected response for this command");
  }

  return parsed.data;
}

export async function searchEpisode(episodeIds: number[]): Promise<Command> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Queueing episode search...",
  });

  try {
    const result = await executeCommand("EpisodeSearch", { episodeIds });

    toast.style = Toast.Style.Success;
    toast.title = "Episode search queued";
    toast.message = result.status ? `Status: ${result.status}` : undefined;

    return result;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Episode search failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
    throw error;
  }
}

export async function searchSeason(seriesId: number, seasonNumber: number): Promise<Command> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Queueing season search...",
  });

  try {
    const result = await executeCommand("SeasonSearch", { seriesId, seasonNumber });

    toast.style = Toast.Style.Success;
    toast.title = "Season search queued";
    toast.message = result.status ? `Status: ${result.status}` : undefined;

    return result;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Season search failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
    throw error;
  }
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
      const payload = await parseResponsePayload(response);
      throw getApiError(response.status, payload);
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
