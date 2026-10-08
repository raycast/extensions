import axios, { AxiosInstance } from "axios";
import rateLimit, { getLimiter } from "axios-rate-limit";
import { Cache, environment } from "@raycast/api";

const cache = new Cache();

const THIRTY_SECONDS_MS = 30 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCached<T>(key: string, ttlMs: number): T | null {
  const raw = cache.get(key);
  if (!raw) return null;
  const entry = JSON.parse(raw) as CacheEntry<T>;
  const remainingTtl = Date.now() - entry.timestamp - ttlMs;
  if (remainingTtl > 0) return null;
  return entry.data;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, JSON.stringify({ data, timestamp: Date.now() }));
}

interface ErrorResponse {
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface UserResponse {
  id: number;
  name: string;
  email?: string;
  status: string;
  groups: string[];
}

export interface CompanyResponse {
  company_name: string;
  duration_format: "decimal" | "hhmm";
  absence_requests_enabled: boolean;
  projects_enabled: boolean;
  groups_enabled: boolean;
}

export interface TaskResponse {
  id: number;
  name: string;
  archived?: boolean;
  default?: boolean;
}

export interface ProjectStub {
  id: number;
  code?: string;
  name: string;
  client?: string | ClientStub;
  archived?: boolean;
}

export interface ProjectResponse extends ProjectStub {
  tasks: TaskResponse[];
  starts_on?: string;
  ends_on?: string;
  notes?: string;
  budget?: string;
  budget_in_seconds?: number;
  budget_is_monthly?: boolean;
  groups?: string[];
  teams?: string[];
}

export interface ClientStub {
  id: number;
  name: string;
}

export interface TimerResponse {
  date: string;
  start_time: string;
  duration: string;
  duration_in_seconds: number;
  note?: string;
  user?: UserResponse;
  task?: TaskResponse;
  project?: ProjectStub;
}

export interface TimeEntryResponse {
  id: number;
  date: string;
  start_time: string;
  end_time?: string;
  duration: string;
  duration_in_seconds: number;
  note?: string;
  user?: UserResponse;
  task?: TaskResponse;
  project?: ProjectStub;
}

export interface AbsenceTypeResponse {
  id: number;
  name: string;
  archived: boolean;
  grants_work_time: boolean;
  is_vacation: boolean;
}

export interface AbsenceResponse {
  id: number;
  start_date: string;
  end_date: string;
  first_half_day: boolean;
  second_half_day: boolean;
  is_recurring: boolean;
  weekly_repeat_interval?: number;
  user: UserResponse;
  absence_type: AbsenceTypeResponse;
}

export interface OverviewResponse {
  overtime: string;
  overtime_in_seconds: number;
  vacation: {
    redeemed_days: number;
    remaining_days: number;
  };
}

const rateLimiter = getLimiter({ maxRequests: 100, perMilliseconds: 60_000 });

export class HakunaClient {
  private apiToken: string;
  private baseUrl: string;
  private axiosInstance: AxiosInstance;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
    this.baseUrl = "https://app.hakuna.ch/api/v1";
    this.axiosInstance = rateLimit(
      axios.create({
        baseURL: this.baseUrl,
        headers: {
          "X-Auth-Token": `${this.apiToken}`,
          "Content-Type": "application/json",
          "User-Agent": `Raycast/${environment.raycastVersion} (${environment.extensionName}${environment.isDevelopment ? "; developmentMode" : ""}) axios/${axios.VERSION}`,
        },
      }),
      { rateLimiter },
    );
  }

  async startTimer(
    taskId: number,
    projectId?: number,
    startTime?: string,
    note?: string,
  ): Promise<TimerResponse> {
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    const payload: {
      task_id: number;
      project_id?: number;
      start_time?: string;
      note?: string;
    } = {
      task_id: taskId,
    };
    if (projectId) payload.project_id = projectId;
    if (startTime) payload.start_time = startTime;
    if (note) payload.note = note;

    try {
      const response = await this.axiosInstance.post<TimerResponse>(
        "/timer",
        payload,
      );
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async getTimer(): Promise<TimerResponse | null> {
    const result = await this.cachedGet<TimerResponse>(
      "/timer",
      THIRTY_SECONDS_MS,
    );
    return result.date === null ? null : result;
  }

  async deleteTimer(): Promise<void> {
    try {
      await this.axiosInstance.delete("/timer");
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async stopTimer(): Promise<TimeEntryResponse> {
    try {
      const response =
        await this.axiosInstance.put<TimeEntryResponse>("/timer");
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async getOverview(userId?: number): Promise<OverviewResponse> {
    const url = userId ? `/overview?user_id=${userId}` : "/overview";
    return this.cachedGet<OverviewResponse>(url, THIRTY_SECONDS_MS);
  }

  private async cachedGet<T>(url: string, ttlMs: number): Promise<T> {
    const cached = getCached<T>(url, ttlMs);
    if (cached) return cached;
    try {
      const response = await this.axiosInstance.get<T>(url);
      setCached(url, response.data);
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async getUsers(): Promise<UserResponse[]> {
    return this.cachedGet<UserResponse[]>("/users", ONE_DAY_MS);
  }

  async getMe(): Promise<UserResponse> {
    return this.cachedGet<UserResponse>("/users/me", ONE_DAY_MS);
  }

  async getCompany(): Promise<CompanyResponse> {
    return this.cachedGet<CompanyResponse>("/company", ONE_WEEK_MS);
  }

  async getProjects(): Promise<ProjectResponse[]> {
    return this.cachedGet<ProjectResponse[]>("/projects", ONE_DAY_MS);
  }

  async getTasks(): Promise<TaskResponse[]> {
    return this.cachedGet<TaskResponse[]>("/tasks", ONE_DAY_MS);
  }

  async getAbsenceTypes(): Promise<AbsenceTypeResponse[]> {
    return this.cachedGet<AbsenceTypeResponse[]>("/absence_types", ONE_WEEK_MS);
  }

  static clearCache(): void {
    cache.clear();
  }

  async getAbsences(year: number, userId?: number): Promise<AbsenceResponse[]> {
    const url = userId
      ? `/absences?year=${year}&user_id=${userId}`
      : `/absences?year=${year}`;
    return this.cachedGet<AbsenceResponse[]>(url, ONE_HOUR_MS);
  }

  async getTimeEntries(date: string): Promise<TimeEntryResponse[]> {
    return this.cachedGet<TimeEntryResponse[]>(
      `/time_entries?start_date=${date}&end_date=${date}`,
      THIRTY_SECONDS_MS,
    );
  }

  async deleteTimeEntry(id: number): Promise<void> {
    try {
      await this.axiosInstance.delete(`/time_entries/${id}`);
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async updateTimeEntry(
    id: number,
    taskId: number,
    projectId: number | undefined,
    date: string,
    startTime: string,
    endTime?: string,
    note?: string,
  ): Promise<TimeEntryResponse> {
    const payload: {
      task_id: number;
      project_id?: number;
      date: string;
      start_time: string;
      end_time?: string;
      note?: string;
    } = { task_id: taskId, date, start_time: startTime, end_time: endTime };
    if (projectId) payload.project_id = projectId;
    if (note) payload.note = note;

    try {
      const response = await this.axiosInstance.patch<TimeEntryResponse>(
        `/time_entries/${id}`,
        payload,
      );
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async createTimeEntry(
    taskId: number,
    projectId: number | undefined,
    date: string,
    startTime: string,
    endTime?: string | null,
    note?: string,
  ): Promise<TimeEntryResponse> {
    const payload: {
      task_id: number;
      project_id?: number;
      date: string;
      start_time: string;
      end_time: string | null;
      note?: string;
    } = {
      task_id: taskId,
      date,
      start_time: startTime,
      end_time: endTime ?? null,
    };
    if (projectId) payload.project_id = projectId;
    if (note) payload.note = note;

    try {
      const response = await this.axiosInstance.post<TimeEntryResponse>(
        "/time_entries",
        payload,
      );
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  private handleApiError(error: unknown): never {
    if (axios.isAxiosError(error) && error.response) {
      const errorData = error.response.data as ErrorResponse;
      throw new Error(
        `API Error: ${error.response.status} - ${errorData.message || errorData.error || "Unknown error"}`,
      );
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred");
  }
}
