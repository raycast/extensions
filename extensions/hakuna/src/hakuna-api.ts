import axios, { AxiosInstance } from "axios";

interface ErrorResponse {
  message?: string;
  error?: string;
  [key: string]: unknown;
}

interface TimerResponse {
  id: number;
  starts: string;
  ends: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: string;
  duration_in_seconds: number;
  note: string | null;
  // Add other fields as necessary
}

interface OverviewResponse {
  overtime: string;
  overtime_in_seconds: number;
  vacation: {
    redeemed_days: number;
    remaining_days: number;
  };
}

export class HakunaTimer {
  private apiToken: string;
  private baseUrl: string;
  private axiosInstance: AxiosInstance;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
    this.baseUrl = "https://app.hakuna.ch/api/v1";
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "X-Auth-Token": `${this.apiToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  async startTimer(taskId: string, projectId?: string): Promise<TimerResponse> {
    if (!taskId) {
      throw new Error("Task ID is required");
    }

    const payload: { task_id: string; project_id?: string } = {
      task_id: taskId,
    };
    if (projectId) {
      payload.project_id = projectId;
    }

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
