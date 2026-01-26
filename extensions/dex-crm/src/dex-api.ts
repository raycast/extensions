import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import {
  DexContact,
  DexContactUpdate,
  DexContactsResponse,
  DexReminder,
  DexRemindersResponse,
  Preferences,
} from "./types";

const BASE_URL = "https://api.getdex.com/api/rest";

export class DexAPI {
  private apiKey: string;
  private static contactsCache: DexContact[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.apiKey = preferences.apiKey;
  }

  private static invalidateCache(): void {
    DexAPI.contactsCache = null;
    DexAPI.cacheTimestamp = 0;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey || this.apiKey.trim() === "") {
      throw new Error("API key not configured. Please add your Dex API key in extension preferences (⌘,)");
    }

    const url = `${BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
      "x-hasura-dex-api-key": this.apiKey,
      "Content-Type": "application/json",
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      if (!response.ok) {
        // Try to get error details from response body
        let errorMessage = "";
        try {
          const errorBody = await response.text();
          if (errorBody) {
            try {
              const errorJson = JSON.parse(errorBody);
              errorMessage = errorJson.message || errorJson.error || errorBody;
            } catch {
              errorMessage = errorBody;
            }
          }
        } catch {
          // Ignore error parsing errors
        }

        // Provide more helpful error messages based on status code
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Invalid API key. Please check your Dex API key in extension preferences (⌘,). Get your API key from https://app.getdex.com/settings/integrations",
          );
        } else if (response.status === 404) {
          throw new Error("Resource not found. The contact may have been deleted.");
        } else if (response.status === 400) {
          throw new Error(`Bad request: ${errorMessage || "Invalid data sent to API"}`);
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        } else if (response.status >= 500) {
          throw new Error(`Dex server error (${response.status}). Please try again later.`);
        } else {
          throw new Error(`Dex API error: ${response.status} ${errorMessage || response.statusText}`);
        }
      }

      return (await response.json()) as T;
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Network error. Please check your internet connection and try again.");
      }
      throw error;
    }
  }

  async getAllContacts(limit = 100, offset = 0): Promise<DexContact[]> {
    const response = await this.request<DexContactsResponse>(`/contacts?limit=${limit}&offset=${offset}`);
    return response.contacts;
  }

  async searchContacts(query: string, limit = 50): Promise<DexContact[]> {
    // Check if cache is valid
    const now = Date.now();
    const cacheAge = now - DexAPI.cacheTimestamp;
    const isCacheValid = DexAPI.contactsCache !== null && cacheAge < DexAPI.CACHE_DURATION;

    let allContacts: DexContact[];

    if (isCacheValid) {
      // Use cached contacts
      allContacts = DexAPI.contactsCache!;
    } else {
      // Fetch all contacts by paginating through the API
      allContacts = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      // Fetch contacts in batches until we have all of them
      while (hasMore) {
        const batch = await this.getAllContacts(pageSize, offset);
        allContacts.push(...batch);

        // If we got fewer contacts than requested, we've reached the end
        if (batch.length < pageSize) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      }

      // Update cache
      DexAPI.contactsCache = allContacts;
      DexAPI.cacheTimestamp = now;
    }

    const normalizedQuery = query.toLowerCase();

    return allContacts
      .filter((contact) => {
        const fullName = `${contact.first_name || ""} ${contact.last_name || ""}`.toLowerCase();
        const jobTitle = (contact.job_title || "").toLowerCase();
        const emails = contact.emails?.map((e) => e.email.toLowerCase()).join(" ") || "";

        return (
          fullName.includes(normalizedQuery) || jobTitle.includes(normalizedQuery) || emails.includes(normalizedQuery)
        );
      })
      .slice(0, limit);
  }

  async getContact(contactId: string): Promise<DexContact> {
    const response = await this.request<DexContactsResponse>(`/contacts/${contactId}`);
    return response.contacts[0];
  }

  async createContact(contact: Partial<DexContact>): Promise<DexContact> {
    const response = await this.request<DexContactsResponse>("/contacts", {
      method: "POST",
      body: JSON.stringify(contact),
    });
    DexAPI.invalidateCache();
    return response.contacts[0];
  }

  async updateContact(update: DexContactUpdate): Promise<DexContact> {
    const { id, ...changes } = update;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await this.request<any>(`/contacts/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        contactId: id,
        changes: changes,
      }),
    });
    DexAPI.invalidateCache();

    // Handle different response formats
    if (response.contacts && response.contacts.length > 0) {
      return response.contacts[0];
    } else if (response.contact) {
      return response.contact;
    } else if (Array.isArray(response) && response.length > 0) {
      return response[0];
    } else {
      // If response is the contact itself
      return response;
    }
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.request(`/contacts/${contactId}`, {
      method: "DELETE",
    });
    DexAPI.invalidateCache();
  }

  async getRecentContacts(limit = 20): Promise<DexContact[]> {
    const response = await this.request<DexContactsResponse>(`/contacts?limit=${limit}`);
    // Sort by updated_at on the client side
    return response.contacts.sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });
  }

  // Reminder operations
  async getAllReminders(limit = 100, offset = 0): Promise<DexReminder[]> {
    const response = await this.request<DexRemindersResponse>(`/reminders?limit=${limit}&offset=${offset}`);
    return response.reminders;
  }

  async createReminder(contactId: string, reminderAt: string, note?: string): Promise<DexReminder> {
    const response = await this.request<DexRemindersResponse>("/reminders", {
      method: "POST",
      body: JSON.stringify({
        contact_id: contactId,
        reminder_at: reminderAt,
        note: note || null,
      }),
    });
    DexAPI.invalidateCache();
    return response.reminders[0];
  }

  async updateReminder(reminderId: string, reminderAt?: string, note?: string): Promise<DexReminder> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {};
    if (reminderAt) updates.reminder_at = reminderAt;
    if (note !== undefined) updates.note = note;

    const response = await this.request<DexRemindersResponse>(`/reminders/${reminderId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    DexAPI.invalidateCache();
    return response.reminders[0];
  }

  async deleteReminder(reminderId: string): Promise<void> {
    await this.request(`/reminders/${reminderId}`, {
      method: "DELETE",
    });
    DexAPI.invalidateCache();
  }

  async getContactReminders(contactId: string): Promise<DexReminder[]> {
    const allReminders = await this.getAllReminders(1000);
    return allReminders.filter((r) => r.contact_id === contactId);
  }
}
