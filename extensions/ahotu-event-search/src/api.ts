import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import type { EventSearchResult, Preferences, SearchParams } from "./types";

const preferences = getPreferenceValues<Preferences>();

export class AhotuAPI {
  private baseUrl: string;
  private userEmail: string;
  private userToken: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = preferences.apiUrl || "https://core.ahotu.com";
    this.userEmail = preferences.userEmail;
    this.userToken = preferences.userToken;
    this.apiKey = preferences.apiKey;

    // Remove trailing slash if present
    if (this.baseUrl.endsWith("/")) {
      this.baseUrl = this.baseUrl.slice(0, -1);
    }
  }

  /**
   * Search for events using the autocomplete API
   */
  async searchEvents(params: SearchParams): Promise<EventSearchResult[]> {
    const queryParams = new URLSearchParams();

    // Add search term
    if (params.term) {
      queryParams.append("term", params.term);
    }

    // Add array parameters
    if (params.id && params.id.length > 0) {
      for (const id of params.id) {
        queryParams.append("id[]", id.toString());
      }
    }

    if (params.wm_id && params.wm_id.length > 0) {
      for (const id of params.wm_id) {
        queryParams.append("wm_id[]", id);
      }
    }

    if (params.permalink && params.permalink.length > 0) {
      for (const p of params.permalink) {
        queryParams.append("permalink[]", p);
      }
    }

    if (params.country_in && params.country_in.length > 0) {
      for (const c of params.country_in) {
        queryParams.append("country_in[]", c);
      }
    }

    if (params.region_in && params.region_in.length > 0) {
      for (const r of params.region_in) {
        queryParams.append("region_in[]", r);
      }
    }

    if (params.month_in && params.month_in.length > 0) {
      for (const m of params.month_in) {
        queryParams.append("month_in[]", m.toString());
      }
    }

    if (params.year_in && params.year_in.length > 0) {
      for (const y of params.year_in) {
        queryParams.append("year_in[]", y.toString());
      }
    }

    if (params.exclude_keywords && params.exclude_keywords.length > 0) {
      for (const k of params.exclude_keywords) {
        queryParams.append("exclude_keywords[]", k);
      }
    }

    if (params.status_in && params.status_in.length > 0) {
      for (const s of params.status_in) {
        queryParams.append("status_in[]", s);
      }
    }

    if (params.registration_platform_in && params.registration_platform_in.length > 0) {
      for (const p of params.registration_platform_in) {
        queryParams.append("registration_platform_in[]", p);
      }
    }

    // Add boolean/string parameters
    if (params.client !== undefined) {
      queryParams.append("client", params.client.toString());
    }

    if (params.population) {
      queryParams.append("population", params.population);
    }

    if (params.include_editions !== undefined) {
      queryParams.append("include_editions", params.include_editions.toString());
    }

    if (params.include_races !== undefined) {
      queryParams.append("include_races", params.include_races.toString());
    }

    if (params.admin !== undefined) {
      queryParams.append("admin", params.admin.toString());
    }

    const url = `${this.baseUrl}/v1/a_events/autocomplete?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": this.userEmail,
        "X-User-Token": this.userToken,
        "X-Api-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as EventSearchResult[];
    return data;
  }

  /**
   * Get event URL for opening in browser
   */
  getEventUrl(event: EventSearchResult): string {
    return `${this.baseUrl}/events/${event.value}`;
  }

  /**
   * Get admin URL for event
   */
  getAdminUrl(event: EventSearchResult): string {
    return `${this.baseUrl}/v1/a_events/${event.value}`;
  }
}
