import { getPreferenceValues } from "@raycast/api";
import { PagerDutyApiResponse } from "./types";

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
      throw new Error("PagerDuty API token and email are required. Please configure them in extension preferences.");
    }
  }

  private async makeRequest<T>(endpoint: string, params: Record): Promise {
    try {
      const url = new URL(endpoint, PAGERDUTY_API_BASE);

      // Add parameters to URL
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => url.searchParams.append(key, v));
        } else {
          url.searchParams.append(key, value);
        }
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Token token=${this.apiToken}`,
          Accept: "application/vnd.pagerduty+json;version=2",
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMessages = {
          401: "Invalid PagerDuty API token. Please check your credentials.",
          403: "Access denied. Please ensure your API token has the required permissions.",
        };

        if (response.status in errorMessages) {
          throw new Error(errorMessages[response.status as keyof typeof errorMessages]);
        } else if (response.status >= 500) {
          throw new Error("PagerDuty service is temporarily unavailable. Please try again later.");
        } else {
          throw new Error(`PagerDuty API error: ${response.status} ${response.statusText}`);
        }
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

  private async getCurrentUser(): Promise {
    const response = await this.makeRequest<PagerDutyApiResponse>("/users", {
      query: this.userEmail,
    });

    const user = response.users?.find((u) => u.email === this.userEmail);
    if (!user) {
      throw new Error(`User with email ${this.userEmail} not found. Please check your email address.`);
    }

    return user;
  }

  private async getOnCallSchedules(): Promise {
    const user = await this.getCurrentUser();
    const now = new Date();

    // Split into smaller chunks to avoid API limits
    // Get past 2 months and future 2 months separately
    const twoMonthsAgo = new Date(now.getTime() - 2 * 30 * 24 * 60 * 60 * 1000);
    const twoMonthsFromNow = new Date(now.getTime() + 2 * 30 * 24 * 60 * 60 * 1000);

    try {
      // Fetch past and future data in one call with a smaller range
      const response = await this.makeRequest<PagerDutyApiResponse>("/oncalls", {
        "user_ids[]": user.id,
        since: twoMonthsAgo.toISOString(),
        until: twoMonthsFromNow.toISOString(),
        limit: "100", // Explicit limit to avoid issues
      });

      return response.oncalls || [];
    } catch (error) {
      // If still getting 400, try with even smaller range (1 month past + 2 months future)
      if (error instanceof Error && error.message.includes("400")) {
        const oneMonthAgo = new Date(now.getTime() - 1 * 30 * 24 * 60 * 60 * 1000);

        const fallbackResponse = await this.makeRequest<PagerDutyApiResponse>("/oncalls", {
          "user_ids[]": user.id,
          since: oneMonthAgo.toISOString(),
          until: twoMonthsFromNow.toISOString(),
          limit: "100",
        });

        return fallbackResponse.oncalls || [];
      }
      throw error;
    }
  }

  async getCurrentOnCallStatus(): Promise {
    const onCallData = await this.getOnCallSchedules();
    const now = new Date();

    const currentOnCall = onCallData
      .filter((entry) => {
        const start = new Date(entry.start);
        const end = new Date(entry.end);
        return now >= start && now <= end;
      })
      .map((entry) => ({
        schedule: entry.schedule,
        user: entry.user,
        start: new Date(entry.start),
        end: new Date(entry.end),
        level: entry.escalation_level,
      }));

    return {
      isOnCall: currentOnCall.length > 0,
      schedules: currentOnCall,
    };
  }

  async getUpcomingOnCallSchedules(): Promise {
    const onCallData = await this.getOnCallSchedules();
    const now = new Date();

    return onCallData
      .filter((entry) => new Date(entry.start) > now)
      .map((entry) => ({
        schedule: entry.schedule,
        user: entry.user,
        start: new Date(entry.start),
        end: new Date(entry.end),
        level: entry.escalation_level,
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  async getPastOnCallSchedules(): Promise {
    const onCallData = await this.getOnCallSchedules();
    const now = new Date();

    return onCallData
      .filter((entry) => new Date(entry.end) < now)
      .map((entry) => ({
        schedule: entry.schedule,
        user: entry.user,
        start: new Date(entry.start),
        end: new Date(entry.end),
        level: entry.escalation_level,
      }))
      .sort((a, b) => b.start.getTime() - a.start.getTime()); // Sort past schedules in reverse chronological order
  }

  async getAllOnCallSchedules(): Promise {
    const onCallData = await this.getOnCallSchedules();

    return onCallData
      .map((entry) => ({
        schedule: entry.schedule,
        user: entry.user,
        start: new Date(entry.start),
        end: new Date(entry.end),
        level: entry.escalation_level,
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }
}
