import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { ApiResponse, Recording, SearchParams, PaginatedResponse, SearchResult } from "../types";
import { getMockRecordings, searchMockRecordings } from "../utils/mockData";
import { API_CONSTANTS, ERROR_MESSAGES } from "../constants";
import { validateApiResponse } from "../utils/validation";

interface Preferences {
  apiKey: string;
  useMockData?: boolean;
}

class TldvApiClient {
  private apiKey: string;
  private baseUrl: string;
  private useMockData: boolean;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.apiKey = preferences.apiKey || "";
    this.baseUrl = API_CONSTANTS.DEFAULT_API_URL;
    // Use real API if API key is provided, otherwise use mock data
    this.useMockData = preferences.useMockData || !this.apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    // If using mock data, don't make real API calls
    // This should be handled in individual methods that use request()
    if (this.useMockData) {
      return {
        error: undefined,
        status: 200,
        data: undefined as unknown as T,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_CONSTANTS.REQUEST_TIMEOUT);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeout);

      let data: T;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = (await response.json()) as T;

        if (!validateApiResponse(data)) {
          throw new Error(ERROR_MESSAGES.INVALID_RESPONSE);
        }
      } else {
        const text = await response.text();
        throw new Error(
          `${ERROR_MESSAGES.INVALID_RESPONSE}. Status: ${response.status}, Body: ${text.substring(0, 100)}`,
        );
      }

      return {
        data,
        status: response.status,
        error: response.ok ? undefined : `Request failed with status ${response.status}`,
      };
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return {
            error: ERROR_MESSAGES.TIMEOUT,
            status: 408,
          };
        }
        return {
          error: error.message,
          status: 500,
        };
      }

      return {
        error: "Unknown error occurred",
        status: 500,
      };
    }
  }

  async getRecordings(
    page = 1,
    pageSize = API_CONSTANTS.DEFAULT_PAGE_SIZE,
  ): Promise<ApiResponse<PaginatedResponse<Recording>>> {
    if (this.useMockData) {
      return {
        data: getMockRecordings(page, pageSize),
        status: 200,
      };
    }

    // tl;dv API pagination params with sorting by date (newest first)
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sort: "-happenedAt", // Sort by date, newest first
    });

    // Convert API response to our format
    const response = await this.request<{
      page: number;
      pageSize: number;
      pages: number;
      total: number;
      results: Array<{
        id: string;
        name: string;
        happenedAt: string;
        duration: number;
        url: string;
        invitees: Array<{ name: string; email: string }>;
        organizer: { name: string; email: string };
        extraProperties?: { conferenceId?: string };
      }>;
    }>(`/meetings?${params.toString()}`);

    if (response.data) {
      const apiResponse = response.data;
      const convertedRecordings = (apiResponse.results || []).map(this.convertApiRecordingToRecording);

      return {
        data: {
          items: convertedRecordings,
          total: apiResponse.total || 0,
          page: apiResponse.page || page,
          pageSize: apiResponse.pageSize || pageSize,
          hasMore: apiResponse.page < apiResponse.pages,
        },
        status: response.status,
        error: response.error,
      };
    }

    return response as ApiResponse<PaginatedResponse<Recording>>;
  }

  async getRecording(id: string): Promise<ApiResponse<Recording>> {
    return this.request<Recording>(`/meetings/${id}`);
  }

  async searchRecordings(searchParams: SearchParams): Promise<ApiResponse<PaginatedResponse<SearchResult>>> {
    if (this.useMockData) {
      return {
        data: searchMockRecordings(searchParams.query, searchParams.page || 1, searchParams.pageSize || 20),
        status: 200,
      };
    }

    const params = new URLSearchParams();

    params.append("q", searchParams.query);

    if (searchParams.page) {
      params.append("page", searchParams.page.toString());
    }

    if (searchParams.pageSize) {
      params.append("limit", searchParams.pageSize.toString());
    }

    if (searchParams.sortBy) {
      const sortField = searchParams.sortBy === "date" ? "createdAt" : searchParams.sortBy;
      const sortPrefix = searchParams.sortOrder === "desc" ? "-" : "";
      params.append("sort", `${sortPrefix}${sortField}`);
    }

    if (searchParams.filters) {
      const filters = searchParams.filters;

      if (filters.dateFrom) {
        params.append("dateFrom", filters.dateFrom);
      }

      if (filters.dateTo) {
        params.append("dateTo", filters.dateTo);
      }

      if (filters.participants?.length) {
        params.append("participants", filters.participants.join(","));
      }

      if (filters.tags?.length) {
        params.append("tags", filters.tags.join(","));
      }

      if (filters.meetingType?.length) {
        params.append("meetingType", filters.meetingType.join(","));
      }

      if (filters.durationMin !== undefined) {
        params.append("durationMin", filters.durationMin.toString());
      }

      if (filters.durationMax !== undefined) {
        params.append("durationMax", filters.durationMax.toString());
      }

      if (filters.hasTranscript !== undefined) {
        params.append("hasTranscript", filters.hasTranscript.toString());
      }

      if (filters.hasSummary !== undefined) {
        params.append("hasSummary", filters.hasSummary.toString());
      }
    }

    return this.request<PaginatedResponse<SearchResult>>(`/meetings/search?${params.toString()}`);
  }

  async getTranscript(meetingId: string): Promise<ApiResponse<string>> {
    const response = await this.request<{ transcript: string }>(`/meetings/${meetingId}/transcript`);

    if (response.data) {
      return {
        ...response,
        data: response.data.transcript,
      };
    }

    return response as ApiResponse<string>;
  }

  async getHighlights(meetingId: string): Promise<ApiResponse<{ highlights: unknown[] }>> {
    return this.request<{ highlights: unknown[] }>(`/meetings/${meetingId}/highlights`);
  }

  private convertApiRecordingToRecording(apiMeeting: {
    id: string;
    name: string;
    happenedAt: string;
    duration: number;
    url: string;
    invitees?: Array<{ name: string; email: string }>;
    organizer?: { name: string; email: string };
    extraProperties?: { conferenceId?: string };
  }): Recording {
    // Parse the date string properly
    const dateStr = apiMeeting.happenedAt;
    const parsedDate = new Date(dateStr);
    const isoDate = parsedDate.toISOString();

    return {
      id: apiMeeting.id,
      title: apiMeeting.name || "Untitled Meeting",
      description: "",
      date: isoDate,
      createdAt: isoDate,
      updatedAt: isoDate,
      duration: Math.round(apiMeeting.duration || 0),
      participants: [
        ...(apiMeeting.organizer ? [apiMeeting.organizer.name || apiMeeting.organizer.email] : []),
        ...(apiMeeting.invitees || []).map((i) => i.name || i.email).filter((n) => n),
      ],
      tags: [],
      url: apiMeeting.url,
      thumbnailUrl: "",
      status: "ready" as const,
      meetingType: apiMeeting.extraProperties?.conferenceId ? "google_meet" : "zoom",
      summary: undefined,
      highlights: undefined,
    };
  }
}

export const apiClient = new TldvApiClient();
