import axios, { AxiosInstance } from "axios";
import rateLimit from "axios-rate-limit";
import { Cache, environment } from "@raycast/api";

const cache = new Cache();

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
  if (Date.now() - entry.timestamp > ttlMs) return null;
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
  email: string;
  status: string;
  groups: string[];
}

export interface CompanyResponse {
  company_name: string;
  duration_format: string;
  absence_requests_enabled: boolean;
  projects_enabled: boolean;
  groups_enabled: boolean;
}

export function formatDuration(
  totalSeconds: number,
  durationFormat: string,
): string {
  if (durationFormat === "decimal") {
    return `${(totalSeconds / 3600).toFixed(2)} h`;
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export interface Task {
  id: number;
  name: string;
  archived: boolean;
  default: boolean;
}

export interface Project {
  id: number;
  name: string;
  code: string | null;
  client: string;
  tasks: Task[];
  starts_on: string | null;
  ends_on: string | null;
  budget: string | null;
  budget_in_seconds: number | null;
  budget_is_monthly: boolean;
  groups: string[] | null;
  teams: string[] | null;
  notes: string | null;
  archived: boolean;
}

export interface TimerResponse {
  id: number;
  starts: string;
  ends: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  duration: string;
  duration_in_seconds: number;
  note: string | null;
  task?: { id: number; name: string };
  project?: { id: number; name: string; code: string | null; client: string };
}

export interface AbsenceType {
  id: number;
  name: string;
  color: string;
  is_vacation: boolean;
  grants_work_time: boolean;
}

export interface AbsenceResponse {
  id: number;
  start_date: string;
  end_date: string;
  first_half_day: boolean;
  second_half_day: boolean;
  is_recurring: boolean;
  weekly_repeat_interval: number | null;
  user: { id: number; name: string };
  absence_type: AbsenceType;
}

export interface OverviewResponse {
  overtime: string;
  overtime_in_seconds: number;
  vacation: {
    redeemed_days: number;
    remaining_days: number;
  };
}

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
      { maxRequests: 100, perMilliseconds: 60_000 },
    );
  }

  async startTimer(
    taskId: string,
    projectId?: string,
    startTime?: string,
    note?: string,
  ): Promise<TimerResponse> {
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    const payload: {
      task_id: string;
      project_id?: string;
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
    try {
      const response = await this.axiosInstance.get<TimerResponse>("/timer");
      return response.data.date === null ? null : response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async deleteTimer(): Promise<void> {
    try {
      await this.axiosInstance.delete("/timer");
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async updateTimer(
    taskId: string,
    projectId?: string,
    startTime?: string,
    note?: string,
  ): Promise<TimerResponse> {
    await this.deleteTimer();

    const payload: {
      task_id: string;
      project_id?: string;
      start_time?: string;
      note?: string;
    } = {
      task_id: taskId,
      note: note ?? "",
    };
    if (projectId) payload.project_id = projectId;
    if (startTime) payload.start_time = startTime;

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

  async stopTimer(): Promise<TimerResponse> {
    try {
      const response = await this.axiosInstance.put<TimerResponse>("/timer");
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async getWorktime(): Promise<string> {
    const today = new Date().toISOString().split("T")[0];
    const entriesUrl = `/time_entries?start_date=${today}&end_date=${today}`;
    const timerUrl = "/timer";

    try {
      const [entriesResponse, timerResponse] = await Promise.all([
        this.axiosInstance.get<TimerResponse[]>(entriesUrl),
        this.axiosInstance.get<TimerResponse>(timerUrl),
      ]);

      const entries = entriesResponse.data;
      const activeTimer = timerResponse.data;

      let totalSeconds = entries.reduce(
        (sum, entry) => sum + entry.duration_in_seconds,
        0,
      );

      // Add duration of active timer if exists
      if (activeTimer && activeTimer.duration_in_seconds) {
        totalSeconds += activeTimer.duration_in_seconds;
      }

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);

      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async getOverview(userId?: number): Promise<OverviewResponse> {
    try {
      const url = userId ? `/overview?user_id=${userId}` : "/overview";
      const response = await this.axiosInstance.get<OverviewResponse>(url);
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async getOvertime(): Promise<string> {
    try {
      const response =
        await this.axiosInstance.get<OverviewResponse>("/overview");
      return response.data.overtime;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async getVacationDays(): Promise<string> {
    try {
      const response =
        await this.axiosInstance.get<OverviewResponse>("/overview");
      const { redeemed_days, remaining_days } = response.data.vacation;
      return `${redeemed_days}/${remaining_days}`;
    } catch (error) {
      this.handleApiError(error);
    }
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

  async getProjects(): Promise<Project[]> {
    return this.cachedGet<Project[]>("/projects", ONE_DAY_MS);
  }

  async getTasks(): Promise<Task[]> {
    return this.cachedGet<Task[]>("/tasks", ONE_DAY_MS);
  }

  async getAbsenceTypes(): Promise<AbsenceType[]> {
    return this.cachedGet<AbsenceType[]>("/absence_types", ONE_WEEK_MS);
  }

  static clearCache(): void {
    cache.clear();
  }

  async getAbsences(year: number, userId?: number): Promise<AbsenceResponse[]> {
    try {
      const url = userId
        ? `/absences?year=${year}&user_id=${userId}`
        : `/absences?year=${year}`;
      const response = await this.axiosInstance.get<AbsenceResponse[]>(url);
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async getTimeEntries(date: string): Promise<TimerResponse[]> {
    try {
      const response = await this.axiosInstance.get<TimerResponse[]>(
        `/time_entries?start_date=${date}&end_date=${date}`,
      );
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
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
    taskId: string,
    projectId: string | undefined,
    date: string,
    startTime: string,
    endTime: string,
    note?: string,
  ): Promise<TimerResponse> {
    const payload: {
      task_id: string;
      project_id?: string;
      date: string;
      start_time: string;
      end_time: string;
      note?: string;
    } = { task_id: taskId, date, start_time: startTime, end_time: endTime };
    if (projectId) payload.project_id = projectId;
    if (note) payload.note = note;

    try {
      const response = await this.axiosInstance.patch<TimerResponse>(
        `/time_entries/${id}`,
        payload,
      );
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async createTimeEntry(
    taskId: string,
    projectId: string | undefined,
    date: string,
    startTime: string,
    endTime: string,
    note?: string,
  ): Promise<TimerResponse> {
    const payload: {
      task_id: string;
      project_id?: string;
      date: string;
      start_time: string;
      end_time: string;
      note?: string;
    } = { task_id: taskId, date, start_time: startTime, end_time: endTime };
    if (projectId) payload.project_id = projectId;
    if (note) payload.note = note;

    try {
      const response = await this.axiosInstance.post<TimerResponse>(
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
      if (errorData.error === "Timer not running") {
        throw new Error(
          "No active timer. Please start a timer before attempting to stop it.",
        );
      }
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
