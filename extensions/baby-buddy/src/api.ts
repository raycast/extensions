import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

interface Preferences {
  baseUrl: string;
  apiKey: string;
}

export interface Child {
  id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
  slug: string;
  picture: string | null;
}

export interface FeedingEntry {
  id: number;
  child: number;
  start: string;
  end: string;
  duration: string;
  type: string;
  method: string;
  amount: number | null;
  notes: string;
}

export interface SleepEntry {
  id: number;
  child: number;
  start: string;
  end: string;
  duration: string;
  nap: boolean;
  notes: string;
}

export interface DiaperEntry {
  id: number;
  child: number;
  time: string;
  wet: boolean;
  solid: boolean;
  color: string;
  amount: number | null;
  notes: string;
}

export interface Timer {
  id: number;
  name: string;
  start: string;
  end: string | null;
  duration: string | null;
  active: boolean;
  user: number;
  child: number;
}

export interface PumpingEntry {
  id: number;
  child: number;
  start: string;
  end: string;
  duration: string;
  amount: number | null;
  notes: string;
}

export interface TummyTimeEntry {
  id: number;
  child: number;
  start: string;
  end: string;
  duration: string;
  milestone: string;
  notes: string;
}

export class BabyBuddyAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.baseUrl = preferences.baseUrl.endsWith("/") ? preferences.baseUrl.slice(0, -1) : preferences.baseUrl;
    this.apiKey = preferences.apiKey;
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await axios.get(`${this.baseUrl}/api/${endpoint}`, {
      headers: {
        Authorization: `Token ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  }

  async getChildren(): Promise<Child[]> {
    const response = await this.request<{ results: Child[] }>("children/");
    return response.results;
  }

  async getLastFeeding(childId: number): Promise<FeedingEntry | null> {
    const response = await this.request<{ results: FeedingEntry[] }>(
      `feedings/?child=${childId}&limit=1&ordering=-start`,
    );
    return response.results.length > 0 ? response.results[0] : null;
  }

  async getLastSleep(childId: number): Promise<SleepEntry | null> {
    const response = await this.request<{ results: SleepEntry[] }>(`sleep/?child=${childId}&limit=1&ordering=-end`);
    return response.results.length > 0 ? response.results[0] : null;
  }

  async getLastDiaper(childId: number): Promise<DiaperEntry | null> {
    const response = await this.request<{ results: DiaperEntry[] }>(`changes/?child=${childId}&limit=1&ordering=-time`);
    return response.results.length > 0 ? response.results[0] : null;
  }

  async getActiveTimers(): Promise<Timer[]> {
    const response = await this.request<{ results: Timer[] }>("timers/?active=true");
    return response.results;
  }

  async getTimerById(timerId: number): Promise<Timer | null> {
    try {
      return await this.request<Timer>(`timers/${timerId}/`);
    } catch (error) {
      console.error(`Failed to get timer with ID ${timerId}:`, error);
      return null;
    }
  }

  async getChildName(childId: number): Promise<string> {
    try {
      const response = await this.request<{ results: Child[] }>(`children/?id=${childId}`);
      if (response.results && response.results.length > 0) {
        const child = response.results[0];
        return `${child.first_name} ${child.last_name}`;
      }
      return "Unknown Child";
    } catch (error) {
      console.error("Failed to get child name:", error);
      return "Unknown Child";
    }
  }

  async createTimer(childId: number, name: string, start: string): Promise<Timer> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/timers/`,
        {
          child: childId,
          name: name,
          start: start,
          active: true,
        },
        {
          headers: {
            Authorization: `Token ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create timer:", error);
      throw error;
    }
  }

  async updateTimerName(timerId: number, name: string): Promise<Timer> {
    try {
      const response = await axios.patch(
        `${this.baseUrl}/api/timers/${timerId}/`,
        { name: name },
        {
          headers: {
            Authorization: `Token ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update timer name:", error);
      throw error;
    }
  }

  async deleteTimer(timerId: number): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/api/timers/${timerId}/`, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to delete timer:", error);
      throw error;
    }
  }

  async resetTimer(timerId: number): Promise<Timer> {
    try {
      // Reset the timer by updating its start time to now
      const response = await axios.patch(
        `${this.baseUrl}/api/timers/${timerId}/`,
        {
          start: new Date().toISOString(),
          end: null, // Clear any end time if it exists
          active: true, // Ensure the timer is active
        },
        {
          headers: {
            Authorization: `Token ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to reset timer:", error);
      throw error;
    }
  }

  // Feeding methods
  async createFeeding(data: Partial<FeedingEntry>): Promise<FeedingEntry> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/feedings/`, data, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create feeding:", error);
      throw error;
    }
  }

  // Pumping methods
  async createPumping(data: {
    child: number;
    start: string;
    end: string;
    amount: number | null;
    notes: string;
  }): Promise<PumpingEntry> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/pumping/`, data, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create pumping:", error);
      throw error;
    }
  }

  // Sleep methods
  async createSleep(data: Partial<SleepEntry>): Promise<SleepEntry> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/sleep/`, data, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create sleep:", error);
      throw error;
    }
  }

  async updateSleep(sleepId: number, data: Partial<SleepEntry>): Promise<SleepEntry> {
    try {
      const response = await axios.patch(`${this.baseUrl}/api/sleep/${sleepId}/`, data, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to update sleep entry:", error);
      throw error;
    }
  }

  async deleteSleep(sleepId: number): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/api/sleep/${sleepId}/`, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to delete sleep entry:", error);
      throw error;
    }
  }

  // Tummy time methods
  async createTummyTime(data: Partial<TummyTimeEntry>): Promise<TummyTimeEntry> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/tummy-times/`, data, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create tummy time:", error);
      throw error;
    }
  }

  async updateTummyTime(tummyTimeId: number, data: Partial<TummyTimeEntry>): Promise<TummyTimeEntry> {
    try {
      const response = await axios.patch(`${this.baseUrl}/api/tummy-times/${tummyTimeId}/`, data, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to update tummy time entry:", error);
      throw error;
    }
  }

  async deleteTummyTime(tummyTimeId: number): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/api/tummy-times/${tummyTimeId}/`, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to delete tummy time entry:", error);
      throw error;
    }
  }

  async updateTimer(timerId: number, updates: { name?: string; start?: string; end?: string }): Promise<Timer> {
    try {
      const response = await axios.patch(`${this.baseUrl}/api/timers/${timerId}/`, updates, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to update timer:", error);
      throw error;
    }
  }

  // Methods for fetching recent activity data
  async getRecentFeedings(childId: number, limit: number = 20): Promise<FeedingEntry[]> {
    const response = await this.request<{ results: FeedingEntry[] }>(`feedings/?child=${childId}&limit=${limit}`);
    return response.results;
  }

  async getRecentSleep(childId: number, limit: number = 20): Promise<SleepEntry[]> {
    const response = await this.request<{ results: SleepEntry[] }>(`sleep/?child=${childId}&limit=${limit}`);
    return response.results;
  }

  async getRecentDiapers(childId: number, limit: number = 20): Promise<DiaperEntry[]> {
    const response = await this.request<{ results: DiaperEntry[] }>(`changes/?child=${childId}&limit=${limit}`);
    return response.results;
  }

  async getRecentTummyTime(childId: number, limit: number = 20): Promise<TummyTimeEntry[]> {
    const response = await this.request<{ results: TummyTimeEntry[] }>(`tummy-times/?child=${childId}&limit=${limit}`);
    return response.results;
  }

  async getLastTummyTime(childId: number): Promise<TummyTimeEntry | null> {
    const response = await this.request<{ results: TummyTimeEntry[] }>(
      `tummy-times/?child=${childId}&limit=1&ordering=-end`,
    );
    return response.results.length > 0 ? response.results[0] : null;
  }

  // Methods for fetching activity data since a specific date
  async getFeedings(childId: number, startDate: string, limit: number = 100): Promise<FeedingEntry[]> {
    const response = await this.request<{ results: FeedingEntry[] }>(
      `feedings/?child=${childId}&start__gte=${startDate}&limit=${limit}&ordering=-start`,
    );
    return response.results;
  }

  async getSleep(childId: number, startDate: string, limit: number = 100): Promise<SleepEntry[]> {
    const response = await this.request<{ results: SleepEntry[] }>(
      `sleep/?child=${childId}&start__gte=${startDate}&limit=${limit}`,
    );
    return response.results;
  }

  async getDiapers(childId: number, startDate: string, limit: number = 100): Promise<DiaperEntry[]> {
    const response = await this.request<{ results: DiaperEntry[] }>(
      `changes/?child=${childId}&time__gte=${startDate}&limit=${limit}`,
    );
    return response.results;
  }

  async getTummyTime(childId: number, startDate: string, limit: number = 100): Promise<TummyTimeEntry[]> {
    const response = await this.request<{ results: TummyTimeEntry[] }>(
      `tummy-times/?child=${childId}&start__gte=${startDate}&limit=${limit}`,
    );
    return response.results;
  }

  // Methods for fetching today's data
  async getTodayFeedings(childId: number): Promise<FeedingEntry[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Format date as YYYY-MM-DD for the API
    const startDate = todayStart.toISOString().split("T")[0];

    const url = `feedings/?child=${childId}&start__date=${startDate}&limit=100&ordering=-start`;
    const response = await this.request<{ results: FeedingEntry[] }>(url);
    return response.results;
  }

  async getTodaySleep(childId: number): Promise<SleepEntry[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Format date as YYYY-MM-DD for the API
    const startDate = todayStart.toISOString().split("T")[0];

    const response = await this.request<{ results: SleepEntry[] }>(
      `sleep/?child=${childId}&end__date=${startDate}&limit=100&ordering=-end`,
    );
    return response.results;
  }

  async getTodayDiapers(childId: number): Promise<DiaperEntry[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Format date as YYYY-MM-DD for the API
    const startDate = todayStart.toISOString().split("T")[0];

    const response = await this.request<{ results: DiaperEntry[] }>(
      `changes/?child=${childId}&time__date=${startDate}&limit=100&ordering=-time`,
    );
    return response.results;
  }

  async getTodayTummyTime(childId: number): Promise<TummyTimeEntry[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Format date as YYYY-MM-DD for the API
    const startDate = todayStart.toISOString().split("T")[0];

    const response = await this.request<{ results: TummyTimeEntry[] }>(
      `tummy-times/?child=${childId}&end__date=${startDate}&limit=100&ordering=-end`,
    );
    return response.results;
  }

  // Methods for managing feedings
  async updateFeeding(feedingId: number, data: Partial<FeedingEntry>): Promise<FeedingEntry> {
    try {
      const response = await axios.patch(`${this.baseUrl}/api/feedings/${feedingId}/`, data, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to update feeding:", error);
      throw error;
    }
  }

  async deleteFeeding(feedingId: number): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/api/feedings/${feedingId}/`, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to delete feeding:", error);
      throw error;
    }
  }

  // Diaper methods
  async createDiaper(data: Partial<DiaperEntry>): Promise<DiaperEntry> {
    try {
      const response = await axios.post(`${this.baseUrl}/api/changes/`, data, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to create diaper change:", error);
      throw error;
    }
  }

  async updateDiaper(diaperId: number, data: Partial<DiaperEntry>): Promise<DiaperEntry> {
    try {
      const response = await axios.patch(`${this.baseUrl}/api/changes/${diaperId}/`, data, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Failed to update diaper change:", error);
      throw error;
    }
  }

  async deleteDiaper(diaperId: number): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/api/changes/${diaperId}/`, {
        headers: {
          Authorization: `Token ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to delete diaper change:", error);
      throw error;
    }
  }
}
