import {
  ClockStatus,
  NormalizedTimeEntry,
  Project,
  TimesheetEntryInput,
  WhosOutEntry,
} from "./types";
import {
  BambooHREndpoint,
  TimeTrackingAction,
  buildBaseUrl,
  buildUrl,
} from "./endpoints";
import {
  extractTimesheetEntries,
  normalizeEntry,
  normalizeProjects,
  buildClockEntryPayload,
  findOpenEntry,
  formatDate,
} from "./utils";

export class BambooHRClient {
  constructor(
    private readonly apiKey: string,
    private readonly companyDomain: string,
    private readonly employeeId: string,
  ) {}

  public async clockIn() {
    return this.toggleClock(TimeTrackingAction.ClockIn);
  }

  public async clockOut() {
    return this.toggleClock(TimeTrackingAction.ClockOut);
  }

  public async getTimesheetEntries(
    startDate: string,
    endDate: string,
  ): Promise<NormalizedTimeEntry[]> {
    const url = new URL(
      `${buildBaseUrl(this.companyDomain)}/${BambooHREndpoint.TimesheetEntries}?employeeIds=${encodeURIComponent(
        this.employeeId,
      )}&start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
    );

    const response = await this.performRequest(url, { method: "GET" });
    const rawEntries = extractTimesheetEntries(response);

    const normalizedEntries = rawEntries
      .map((entry) => normalizeEntry(entry))
      .filter((entry): entry is NormalizedTimeEntry => Boolean(entry));

    normalizedEntries.sort((a, b) => {
      const aTime = a.start?.getTime() ?? 0;
      const bTime = b.start?.getTime() ?? 0;
      return aTime - bTime;
    });

    return normalizedEntries;
  }

  public async createTimesheetEntry(input: TimesheetEntryInput) {
    const url = new URL(
      `${buildBaseUrl(this.companyDomain)}/${BambooHREndpoint.ClockEntries}`,
    );

    const body = buildClockEntryPayload(input, this.employeeId);

    const response = await this.performRequest(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return response;
  }

  public async updateTimesheetEntry(
    entryId: string,
    input: TimesheetEntryInput,
  ) {
    const url = new URL(
      `${buildBaseUrl(this.companyDomain)}/${BambooHREndpoint.ClockEntries}`,
    );

    const body = buildClockEntryPayload(input, this.employeeId, entryId);

    const response = await this.performRequest(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return response;
  }

  public async deleteTimesheetEntry(entryId: string) {
    const url = new URL(
      `${buildBaseUrl(this.companyDomain)}/${BambooHREndpoint.ClockEntriesDelete}`,
    );

    const body = {
      clockEntryIds: [parseInt(entryId)],
    };

    const response = await this.performRequest(url, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return response;
  }

  public async getTodayStatus(): Promise<ClockStatus> {
    const today = new Date();
    const todayDate = formatDate(today);
    const entries = await this.getTimesheetEntries(todayDate, todayDate);

    const runningEntry = findOpenEntry(entries);
    const lastEntry = entries[entries.length - 1];
    const todayTotalMs = entries.reduce(
      (total, entry) => total + (entry.durationMs ?? 0),
      0,
    );

    if (runningEntry) {
      return {
        status: "clocked_in",
        runningEntry,
        lastEntry,
        todayTotalMs,
      };
    }

    return {
      status: "clocked_out",
      lastEntry,
      todayTotalMs,
    };
  }

  public async listProjects(): Promise<Project[]> {
    const projects: Project[] = [];

    try {
      const url = buildUrl(
        this.companyDomain,
        BambooHREndpoint.EmployeeProjects,
        {
          employeeId: this.employeeId,
        },
      );
      const response = await this.performRequest(url, { method: "GET" });
      projects.push(...normalizeProjects(response));
    } catch (error) {
      console.warn("Employee projects endpoint failed", error);
    }

    if (projects.length === 0) {
      try {
        const url = new URL(
          `${buildBaseUrl(this.companyDomain)}/${BambooHREndpoint.Projects}`,
        );
        const response = await this.performRequest(url, { method: "GET" });
        projects.push(...normalizeProjects(response));
      } catch (error) {
        console.warn("Projects endpoint failed", error);
      }
    }

    const unique = new Map<string, Project>();
    projects.forEach((p) => {
      if (!unique.has(p.id)) unique.set(p.id, p);
    });
    return Array.from(unique.values());
  }

  public async getWhosOut(
    startDate: string,
    endDate: string,
  ): Promise<WhosOutEntry[]> {
    const url = new URL(
      `${buildBaseUrl(this.companyDomain)}/${BambooHREndpoint.WhosOut}?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
    );

    const response = await this.performRequest(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!Array.isArray(response)) {
      return [];
    }

    return response as WhosOutEntry[];
  }

  private async toggleClock(action: TimeTrackingAction) {
    const url = buildUrl(this.companyDomain, BambooHREndpoint.TimeTracking, {
      employeeId: this.employeeId,
      action: action,
    });

    const response = await this.performRequest(url, { method: "POST" });
    return response;
  }

  private async performRequest(url: URL | string, init: RequestInit) {
    const endpoint = typeof url === "string" ? url : url.toString();
    const auth = Buffer.from(this.apiKey + ":x").toString("base64");

    const response = await fetch(endpoint, {
      ...init,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const detail = errorText || response.statusText;
      throw new Error(
        `BambooHR request failed (${response.status}): ${detail}`,
      );
    }

    if (response.status === 204) {
      return undefined;
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.toLowerCase().includes("application/json")) {
      return response.json();
    }

    const text = await response.text();
    if (text.length === 0) {
      return undefined;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
