import { getPreferenceValues } from "@raycast/api";
import { OnCallScheduleEntry, PagerDutyApiResponse, PagerDutyOnCall, PagerDutyUser } from "./types";

interface Preferences {
  apiToken: string;
  userEmail: string;
}

const PAGERDUTY_API_BASE = "https://api.pagerduty.com";
const API_TIMEOUT = 10000; // 10 seconds

export class PagerDutyAPI {
  private apiToken: string;
  private userEmail: string;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.apiToken = preferences.apiToken;
    this.userEmail = preferences.userEmail;

    if (!this.apiToken || !this.userEmail) {
      throw new Error("PagerDuty API token and user email are required. Please configure them in preferences.");
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string | string[]> = {}): Promise<T> {
    try {
      const url = new URL(endpoint, PAGERDUTY_API_BASE);

      // Add query parameters
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v: string) => url.searchParams.append(key, v));
        } else {
          url.searchParams.set(key, value as string);
        }
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Token token=${this.apiToken}`,
          Accept: "application/vnd.pagerduty+json;version=2",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid PagerDuty API token. Please check your API token in preferences.");
        }
        if (response.status === 403) {
          throw new Error("Access denied. Please ensure your API token has the required permissions.");
        }
        if (response.status === 400) {
          throw new Error("Bad request. Please check your configuration and try again.");
        }
        if (response.status >= 500) {
          throw new Error("PagerDuty service is temporarily unavailable. Please try again later.");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Request timed out. Please check your internet connection.");
        }
        throw error;
      }
      throw new Error("An unexpected error occurred while fetching data from PagerDuty.");
    }
  }

  private async getCurrentUser(): Promise<PagerDutyUser> {
    type UserResponse = PagerDutyApiResponse<PagerDutyUser>;
    const response = await this.makeRequest<UserResponse>("/users", {
      query: this.userEmail,
    });

    const user = response.users?.find((u: PagerDutyUser) => u.email === this.userEmail);
    if (!user) {
      throw new Error(`User with email ${this.userEmail} not found. Please check your email address.`);
    }

    return user;
  }

  private async getOnCallSchedules(): Promise<PagerDutyOnCall[]> {
    const user: PagerDutyUser = await this.getCurrentUser();
    const now = new Date();

    // Try 4 months first (2 past + 2 future)
    const fourMonthsAgo = new Date(now);
    fourMonthsAgo.setMonth(now.getMonth() - 2);
    const fourMonthsFromNow = new Date(now);
    fourMonthsFromNow.setMonth(now.getMonth() + 2);

    try {
      type OnCallResponse = PagerDutyApiResponse<PagerDutyOnCall>;
      const response = await this.makeRequest<OnCallResponse>("/oncalls", {
        "user_ids[]": user.id,
        since: fourMonthsAgo.toISOString(),
        until: fourMonthsFromNow.toISOString(),
        limit: "100",
      });

      return response.oncalls || [];
    } catch (error) {
      // Fallback to 3 months (1 past + 2 future) if 4 months fails
      if (error instanceof Error && error.message.includes("Bad request")) {
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(now.getMonth() - 1);

        type OnCallResponse = PagerDutyApiResponse<PagerDutyOnCall>;
        const fallbackResponse = await this.makeRequest<OnCallResponse>("/oncalls", {
          "user_ids[]": user.id,
          since: oneMonthAgo.toISOString(),
          until: fourMonthsFromNow.toISOString(),
          limit: "100",
        });

        return fallbackResponse.oncalls || [];
      }
      throw error;
    }
  }

  async getCurrentOnCallStatus(): Promise<{ schedules: OnCallScheduleEntry[] }> {
    const onCallData: PagerDutyOnCall[] = await this.getOnCallSchedules();
    const now = new Date();

    const currentSchedules: OnCallScheduleEntry[] = onCallData
      .filter((entry: PagerDutyOnCall) => {
        const start = new Date(entry.start);
        const end = new Date(entry.end);
        return now >= start && now <= end;
      })
      .map(
        (entry: PagerDutyOnCall): OnCallScheduleEntry => ({
          schedule: entry.schedule,
          user: entry.user,
          start: new Date(entry.start),
          end: new Date(entry.end),
          level: entry.escalation_level,
        }),
      );

    return { schedules: currentSchedules };
  }

  async getUpcomingOnCallSchedules(): Promise<OnCallScheduleEntry[]> {
    const onCallData: PagerDutyOnCall[] = await this.getOnCallSchedules();
    const now = new Date();

    return onCallData
      .filter((entry: PagerDutyOnCall) => new Date(entry.start) > now)
      .map(
        (entry: PagerDutyOnCall): OnCallScheduleEntry => ({
          schedule: entry.schedule,
          user: entry.user,
          start: new Date(entry.start),
          end: new Date(entry.end),
          level: entry.escalation_level,
        }),
      )
      .sort((a: OnCallScheduleEntry, b: OnCallScheduleEntry) => a.start.getTime() - b.start.getTime());
  }

  async getPastOnCallSchedules(): Promise<OnCallScheduleEntry[]> {
    const onCallData: PagerDutyOnCall[] = await this.getOnCallSchedules();
    const now = new Date();

    return onCallData
      .filter((entry: PagerDutyOnCall) => new Date(entry.end) < now)
      .map(
        (entry: PagerDutyOnCall): OnCallScheduleEntry => ({
          schedule: entry.schedule,
          user: entry.user,
          start: new Date(entry.start),
          end: new Date(entry.end),
          level: entry.escalation_level,
        }),
      )
      .sort((a: OnCallScheduleEntry, b: OnCallScheduleEntry) => b.start.getTime() - a.start.getTime());
  }

  async getAllOnCallSchedules(): Promise<OnCallScheduleEntry[]> {
    const onCallData: PagerDutyOnCall[] = await this.getOnCallSchedules();

    return onCallData
      .map(
        (entry: PagerDutyOnCall): OnCallScheduleEntry => ({
          schedule: entry.schedule,
          user: entry.user,
          start: new Date(entry.start),
          end: new Date(entry.end),
          level: entry.escalation_level,
        }),
      )
      .sort((a: OnCallScheduleEntry, b: OnCallScheduleEntry) => a.start.getTime() - b.start.getTime());
  }
}
