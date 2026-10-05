import { useFetch, showFailureToast } from "@raycast/utils";
import { openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { addDays, format } from "date-fns";
import { z } from "zod";
import type { SingleSeries } from "@/lib/types/episode";
import type { BlocklistResponse } from "@/lib/types/blocklist";
import type { HistoryResponse } from "@/lib/types/history";
import type { SonarrInstance } from "@/lib/types/instance";
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

function getApiConfig(instance: SonarrInstance | null) {
  if (!instance?.url || !instance.apiKey) {
    throw new Error("No Sonarr instance is configured. Check the extension preferences.");
  }

  return {
    url: instance.url,
    headers: {
      "X-Api-Key": instance.apiKey,
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

export function useSonarrAPI<T>(
  instance: SonarrInstance | null,
  endpoint: string,
  options?: { execute?: boolean; showErrorToast?: boolean },
) {
  const isInstanceReady = Boolean(instance?.url && instance.apiKey);
  const fullUrl = isInstanceReady ? `${instance?.url}/api/v3${endpoint}` : "";
  const showErrorToast = options?.showErrorToast ?? true;

  return useFetch<T>(fullUrl, {
    headers: { "X-Api-Key": instance?.apiKey ?? "" },
    execute: isInstanceReady && (options?.execute ?? true),
    // Deliberately off: keeping the previous payload would leave the list
    // showing the instance the user just switched away from, and an action
    // fired from one of those rows would send that instance's IDs to the new
    // one. Same-URL revalidations after a `mutate()` are served from the cache,
    // so this only resets the view when the instance actually changes.
    keepPreviousData: false,
    parseResponse: async (response) => {
      const payload = await parseResponsePayload(response);

      if (!response.ok) {
        throw getApiError(response.status, payload);
      }

      return payload as T;
    },
    onError: (error) => {
      if (!showErrorToast) {
        return;
      }

      showFailureToast(error, {
        title: `Failed to fetch data from ${instance?.name ?? "Sonarr"}`,
        primaryAction: {
          title: "Open Extension Preferences",
          onAction: openExtensionPreferences,
        },
      });
    },
  });
}

export function useCalendar(instance: SonarrInstance | null, futureDays: number = 14) {
  const currentDate = format(new Date(), "yyyy-MM-dd");
  const futureDate = format(addDays(new Date(), futureDays), "yyyy-MM-dd");

  return useSonarrAPI<SingleSeries[]>(
    instance,
    `/calendar?start=${currentDate}&end=${futureDate}&includeSeries=true&includeEpisodeFile=true&includeEpisodeImages=true`,
  );
}

export function useSeries(instance: SonarrInstance | null) {
  return useSonarrAPI<SeriesFull[]>(instance, "/series");
}

export function useQueue(instance: SonarrInstance | null) {
  return useSonarrAPI<{ records: QueueItem[] }>(instance, "/queue?includeEpisode=true&includeSeries=true");
}

export function useWantedMissing(instance: SonarrInstance | null, page: number = 1, pageSize: number = 50) {
  return useSonarrAPI<WantedMissingResponse>(
    instance,
    `/wanted/missing?page=${page}&pageSize=${pageSize}&sortKey=airDateUtc&sortDirection=descending&includeSeries=true`,
  );
}

export function useHistory(instance: SonarrInstance | null, page: number = 1, pageSize: number = 100) {
  return useSonarrAPI<HistoryResponse>(
    instance,
    `/history?page=${page}&pageSize=${pageSize}&sortKey=date&sortDirection=descending&includeSeries=true&includeEpisode=true`,
  );
}

export function useBlocklist(instance: SonarrInstance | null, page: number = 1, pageSize: number = 100) {
  return useSonarrAPI<BlocklistResponse>(
    instance,
    `/blocklist?page=${page}&pageSize=${pageSize}&sortKey=date&sortDirection=descending&includeSeries=true`,
  );
}

export function useCommands(instance: SonarrInstance | null) {
  return useSonarrAPI<Command[]>(instance, "/command");
}

export function useSystemStatus(instance: SonarrInstance | null, options?: { showErrorToast?: boolean }) {
  return useSonarrAPI<SystemStatus>(instance, "/system/status", options);
}

export function useHealth(instance: SonarrInstance | null, options?: { showErrorToast?: boolean }) {
  return useSonarrAPI<HealthCheck[]>(instance, "/health", options);
}

export async function searchSeries(instance: SonarrInstance | null, searchTerm: string): Promise<SeriesLookup[]> {
  try {
    const { url, headers } = getApiConfig(instance);
    const encodedTerm = encodeURIComponent(searchTerm);

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

export async function addSeries(instance: SonarrInstance | null, options: AddSeriesOptions): Promise<SeriesFull> {
  try {
    const { url, headers } = getApiConfig(instance);

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

export async function removeQueueItem(
  instance: SonarrInstance | null,
  id: number,
  blocklist: boolean = false,
): Promise<void> {
  try {
    const { url, headers } = getApiConfig(instance);

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

export async function executeCommand(
  instance: SonarrInstance | null,
  command: string,
  body: Record<string, unknown> = {},
): Promise<Command> {
  const { url, headers } = getApiConfig(instance);

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

export async function searchEpisode(instance: SonarrInstance | null, episodeIds: number[]): Promise<Command> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Queueing episode search...",
  });

  try {
    const result = await executeCommand(instance, "EpisodeSearch", { episodeIds });

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

export async function searchSeason(
  instance: SonarrInstance | null,
  seriesId: number,
  seasonNumber: number,
): Promise<Command> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Queueing season search...",
  });

  try {
    const result = await executeCommand(instance, "SeasonSearch", { seriesId, seasonNumber });

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

export async function toggleEpisodeMonitoring(
  instance: SonarrInstance | null,
  episodeId: number,
  monitored: boolean,
): Promise<void> {
  try {
    const { url, headers } = getApiConfig(instance);

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

export async function getRootFolders(instance: SonarrInstance | null): Promise<RootFolder[]> {
  try {
    const { url, headers } = getApiConfig(instance);

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

export async function getQualityProfiles(instance: SonarrInstance | null): Promise<QualityProfile[]> {
  try {
    const { url, headers } = getApiConfig(instance);

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

export async function testConnection(
  instance: SonarrInstance | null,
  options?: { timeout?: number; retries?: number },
): Promise<{ success: boolean; message: string; status?: SystemStatus }> {
  try {
    const { url, headers } = getApiConfig(instance);

    const status = await fetchAndValidate(`${url}/api/v3/system/status`, SystemStatusSchema, {
      headers,
      timeout: options?.timeout ?? 15000,
      retries: options?.retries ?? 2,
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
