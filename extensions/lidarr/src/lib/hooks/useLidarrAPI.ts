import { useFetch, showFailureToast } from "@raycast/utils";
import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import type {
  AddArtistOptions,
  Album,
  Artist,
  ArtistLookup,
  Command,
  HealthCheck,
  HistoryResponse,
  MetadataProfile,
  QualityProfile,
  QueueResponse,
  Release,
  RootFolder,
  SystemStatus,
} from "@/lib/types/lidarr";
import type { LidarrPreferences } from "@/lib/types/preferences";
import { fetchWithTimeout } from "@/lib/utils/api-helpers";

function getApiConfig() {
  const preferences = getPreferenceValues<LidarrPreferences>();
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
      // Keep original values and let request fail naturally.
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

async function parseJsonOrText(response: Response): Promise<unknown> {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function errorMessageFromPayload(payload: unknown): string | undefined {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return undefined;

  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (typeof record.error === "string") return record.error;

  return undefined;
}

function parseApiError(status: number, payload: unknown): Error {
  const message = errorMessageFromPayload(payload);
  return new Error(message ? `API returned ${status}: ${message}` : `API returned ${status}`);
}

function getFriendlyDownloadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";

  if (/torrent already in session/i.test(message)) {
    return "Torrent already in download session";
  }

  if (/already exists/i.test(message)) {
    return "Release already exists in the download client";
  }

  return message.replace(/\s+/g, " ").trim();
}

export function useLidarrAPI<T>(endpoint: string, options?: { execute?: boolean }) {
  const { url, headers } = getApiConfig();
  const fullUrl = `${url}/api/v1${endpoint}`;

  return useFetch<T>(fullUrl, {
    headers,
    execute: options?.execute ?? true,
    keepPreviousData: true,
    parseResponse: async (response) => {
      const payload = await parseJsonOrText(response);
      if (!response.ok) throw parseApiError(response.status, payload);
      return payload as T;
    },
    onError: (error) => {
      showFailureToast(error, {
        title: "Failed to fetch data from Lidarr",
        primaryAction: {
          title: "Open Extension Preferences",
          onAction: openExtensionPreferences,
        },
      });
    },
  });
}

export function useArtists() {
  return useLidarrAPI<Artist[]>("/artist");
}

export function useArtistAlbums(artistId: number) {
  return useLidarrAPI<Album[]>(`/album?artistId=${artistId}`);
}

export function useAlbumReleases(albumId: number) {
  return useLidarrAPI<Release[]>(`/release?albumId=${albumId}`);
}

export function useQueue() {
  return useLidarrAPI<QueueResponse>("/queue?includeArtist=true&includeAlbum=true");
}

export function useHistory(page = 1, pageSize = 100) {
  return useLidarrAPI<HistoryResponse>(
    `/history?page=${page}&pageSize=${pageSize}&sortKey=date&sortDirection=descending&includeArtist=true&includeAlbum=true`,
  );
}

export function useSystemStatus() {
  return useLidarrAPI<SystemStatus>("/system/status");
}

export function useHealth() {
  return useLidarrAPI<HealthCheck[]>("/health");
}

export async function searchArtist(searchTerm: string): Promise<ArtistLookup[]> {
  const { url, headers } = getApiConfig();

  try {
    const response = await fetchWithTimeout(`${url}/api/v1/artist/lookup?term=${encodeURIComponent(searchTerm)}`, {
      headers,
    });

    const payload = await parseJsonOrText(response);
    if (!response.ok) throw parseApiError(response.status, payload);
    if (!Array.isArray(payload)) return [];

    return payload as ArtistLookup[];
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to search artist",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

export async function getRootFolders(): Promise<RootFolder[]> {
  const { url, headers } = getApiConfig();
  const response = await fetchWithTimeout(`${url}/api/v1/rootfolder`, { headers });
  const payload = await parseJsonOrText(response);
  if (!response.ok) throw parseApiError(response.status, payload);
  return Array.isArray(payload) ? (payload as RootFolder[]) : [];
}

export async function getQualityProfiles(): Promise<QualityProfile[]> {
  const { url, headers } = getApiConfig();
  const response = await fetchWithTimeout(`${url}/api/v1/qualityprofile`, { headers });
  const payload = await parseJsonOrText(response);
  if (!response.ok) throw parseApiError(response.status, payload);
  return Array.isArray(payload) ? (payload as QualityProfile[]) : [];
}

export async function getMetadataProfiles(): Promise<MetadataProfile[]> {
  const { url, headers } = getApiConfig();
  const response = await fetchWithTimeout(`${url}/api/v1/metadataprofile`, { headers });
  const payload = await parseJsonOrText(response);
  if (!response.ok) throw parseApiError(response.status, payload);
  return Array.isArray(payload) ? (payload as MetadataProfile[]) : [];
}

export async function addArtist(options: AddArtistOptions): Promise<Artist> {
  const { url, headers } = getApiConfig();

  const response = await fetchWithTimeout(`${url}/api/v1/artist`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });

  const payload = await parseJsonOrText(response);
  if (!response.ok) throw parseApiError(response.status, payload);

  showToast({
    style: Toast.Style.Success,
    title: "Artist added successfully",
    message: options.artistName,
  });

  return payload as Artist;
}

export async function executeCommand(command: string, body: Record<string, unknown> = {}): Promise<Command> {
  const { url, headers } = getApiConfig();

  const response = await fetchWithTimeout(`${url}/api/v1/command`, {
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

  const payload = await parseJsonOrText(response);
  if (!response.ok) throw parseApiError(response.status, payload);
  return payload as Command;
}

export async function searchArtistLibrary(artistId: number): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Queueing artist search...",
  });

  try {
    const result = await executeCommand("ArtistSearch", { artistIds: [artistId] });
    toast.style = Toast.Style.Success;
    toast.title = "Artist search queued";
    toast.message = result.status ? `Status: ${result.status}` : undefined;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Artist search failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
    throw error;
  }
}

export async function searchAlbum(albumId: number): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Queueing album search...",
  });

  try {
    const result = await executeCommand("AlbumSearch", { albumIds: [albumId] });
    toast.style = Toast.Style.Success;
    toast.title = "Album search queued";
    toast.message = result.status ? `Status: ${result.status}` : undefined;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Album search failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
    throw error;
  }
}

export async function downloadRelease(release: Release): Promise<void> {
  const { url, headers } = getApiConfig();

  try {
    const response = await fetchWithTimeout(`${url}/api/v1/release`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(release),
    });

    const payload = await parseJsonOrText(response);
    if (!response.ok) throw parseApiError(response.status, payload);

    await showToast({
      style: Toast.Style.Success,
      title: "Release sent to download client",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't add release",
      message: getFriendlyDownloadErrorMessage(error),
    });
  }
}

export async function removeQueueItem(id: number, blocklist = false): Promise<void> {
  const { url, headers } = getApiConfig();

  const response = await fetchWithTimeout(`${url}/api/v1/queue/${id}?blocklist=${blocklist}`, {
    method: "DELETE",
    headers,
  });

  const payload = await parseJsonOrText(response);
  if (!response.ok) throw parseApiError(response.status, payload);

  showToast({
    style: Toast.Style.Success,
    title: "Removed from queue",
  });
}

export async function testConnection(): Promise<{ success: boolean; message: string; status?: SystemStatus }> {
  const { url, headers } = getApiConfig();

  try {
    const response = await fetchWithTimeout(`${url}/api/v1/system/status`, {
      headers,
      timeout: 15000,
      retries: 2,
    });
    const payload = await parseJsonOrText(response);
    if (!response.ok) throw parseApiError(response.status, payload);

    const status = payload as SystemStatus;

    return {
      success: true,
      message: `Connected to Lidarr v${status.version}`,
      status,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
