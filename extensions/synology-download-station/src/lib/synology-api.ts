import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  SynologyAuthResponse,
  SynologyTasksResponse,
  SynologyCreateTaskResponse,
  SynologyTask,
  ExtensionPreferences,
  SynologyCredentials,
  TaskCreateRequest,
} from "./types";
import { SYNOLOGY_ERROR_CODES, SESSION_STORAGE_KEY } from "./constants";

class SynologyAPI {
  private credentials: SynologyCredentials;

  constructor() {
    const preferences = getPreferenceValues<ExtensionPreferences>();
    this.credentials = {
      url: preferences.nasUrl.replace(/\/$/, ""), // Remove trailing slash
      username: preferences.username,
      password: preferences.password,
    };
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string | number>): Promise<T> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    const queryString = searchParams.toString();

    const url = `${this.credentials.url}/webapi/${endpoint}?${queryString}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Raycast Synology Download Station Extension",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  private async makePostRequest<T>(endpoint: string, params: Record<string, string | number>): Promise<T> {
    const formData = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const url = `${this.credentials.url}/webapi/${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Raycast Synology Download Station Extension",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error("API POST request failed:", error);
      throw error;
    }
  }

  private handleAPIError(response: { success: boolean; error?: { code: number } }): void {
    if (!response.success && response.error) {
      const errorMessage = SYNOLOGY_ERROR_CODES[response.error.code] || `Unknown error (${response.error.code})`;
      throw new Error(errorMessage);
    }
  }

  async authenticate(): Promise<string> {
    // Check if we have a stored session ID
    const storedSessionId = await LocalStorage.getItem<string>(SESSION_STORAGE_KEY);
    if (storedSessionId) {
      this.credentials.sessionId = storedSessionId;

      // Test if the session is still valid
      try {
        await this.getInfo();
        return storedSessionId;
      } catch {
        // Session is invalid, remove it and continue with fresh authentication
        await LocalStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }

    // Perform fresh authentication
    const response = await this.makeRequest<SynologyAuthResponse>("auth.cgi", {
      api: "SYNO.API.Auth",
      version: 3,
      method: "login",
      account: this.credentials.username,
      passwd: this.credentials.password,
      session: "DownloadStation",
      format: "sid",
    });

    this.handleAPIError(response);

    if (!response.data?.sid) {
      throw new Error("Authentication failed: No session ID received");
    }

    this.credentials.sessionId = response.data.sid;
    await LocalStorage.setItem(SESSION_STORAGE_KEY, response.data.sid);

    return response.data.sid;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.credentials.sessionId) {
      await this.authenticate();
    }
  }

  async getInfo(): Promise<void> {
    await this.ensureAuthenticated();

    const response = await this.makeRequest<{ success: boolean; error?: { code: number } }>(
      "DownloadStation/info.cgi",
      {
        api: "SYNO.DownloadStation.Info",
        version: 1,
        method: "getinfo",
        _sid: this.credentials.sessionId!,
      },
    );

    this.handleAPIError(response);
  }

  async getTasks(): Promise<SynologyTask[]> {
    await this.ensureAuthenticated();

    const response = await this.makeRequest<SynologyTasksResponse>("DownloadStation/task.cgi", {
      api: "SYNO.DownloadStation.Task",
      version: 1,
      method: "list",
      additional: "detail,transfer",
      _sid: this.credentials.sessionId!,
    });

    this.handleAPIError(response);

    return response.data?.tasks || [];
  }

  async getTaskDetails(taskIds: string[]): Promise<SynologyTask[]> {
    if (taskIds.length === 0) return [];

    await this.ensureAuthenticated();

    const response = await this.makeRequest<SynologyTasksResponse>("DownloadStation/task.cgi", {
      api: "SYNO.DownloadStation.Task",
      version: 1,
      method: "getinfo",
      id: taskIds.join(","),
      additional: "detail,transfer",
      _sid: this.credentials.sessionId!,
    });

    this.handleAPIError(response);

    return response.data?.tasks || [];
  }

  async createTask(request: TaskCreateRequest): Promise<void> {
    await this.ensureAuthenticated();

    const params: Record<string, string | number> = {
      api: "SYNO.DownloadStation.Task",
      version: 3,
      method: "create",
      uri: request.uri,
      _sid: this.credentials.sessionId!,
    };

    if (request.destination) {
      params.destination = request.destination;
    }

    const response = await this.makePostRequest<SynologyCreateTaskResponse>("DownloadStation/task.cgi", params);

    this.handleAPIError(response);
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.ensureAuthenticated();

    const response = await this.makeRequest<{ success: boolean; error?: { code: number } }>(
      "DownloadStation/task.cgi",
      {
        api: "SYNO.DownloadStation.Task",
        version: 1,
        method: "delete",
        id: taskId,
        _sid: this.credentials.sessionId!,
      },
    );

    this.handleAPIError(response);
  }

  async pauseTask(taskId: string): Promise<void> {
    await this.ensureAuthenticated();

    const response = await this.makeRequest<{ success: boolean; error?: { code: number } }>(
      "DownloadStation/task.cgi",
      {
        api: "SYNO.DownloadStation.Task",
        version: 1,
        method: "pause",
        id: taskId,
        _sid: this.credentials.sessionId!,
      },
    );

    this.handleAPIError(response);
  }

  async resumeTask(taskId: string): Promise<void> {
    await this.ensureAuthenticated();

    const response = await this.makeRequest<{ success: boolean; error?: { code: number } }>(
      "DownloadStation/task.cgi",
      {
        api: "SYNO.DownloadStation.Task",
        version: 1,
        method: "resume",
        id: taskId,
        _sid: this.credentials.sessionId!,
      },
    );

    this.handleAPIError(response);
  }

  async logout(): Promise<void> {
    if (!this.credentials.sessionId) return;

    try {
      await this.makeRequest<{ success: boolean }>("auth.cgi", {
        api: "SYNO.API.Auth",
        version: 1,
        method: "logout",
        session: "DownloadStation",
        _sid: this.credentials.sessionId,
      });
    } catch (error) {
      // Ignore logout errors as the session might already be invalid
      console.warn("Logout failed:", error);
    } finally {
      await LocalStorage.removeItem(SESSION_STORAGE_KEY);
      this.credentials.sessionId = undefined;
    }
  }
}

let apiInstance: SynologyAPI | null = null;

export function getSynologyAPI(): SynologyAPI {
  if (!apiInstance) {
    apiInstance = new SynologyAPI();
  }
  return apiInstance;
}

export async function handleAPIError(error: unknown): Promise<void> {
  console.error("Synology API Error:", error);
  await showFailureToast(error, { title: "Synology API Error" });
}
