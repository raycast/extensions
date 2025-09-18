import { getPreferenceValues } from "@raycast/api";
import fetch, { RequestInit, Response } from "node-fetch";
import {
  Project,
  WorkPackageType,
  User,
  Priority,
  Status,
  WorkPackage,
  CreateWorkPackageRequest,
  UpdateWorkPackageRequest,
} from "./types";

interface Preferences {
  apiUrl: string;
  apiKey: string;
}

class OpenProjectAPI {
  private _baseURL: string;
  private apiKey: string;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this._baseURL = preferences.apiUrl.replace(/\/$/, "");
    this.apiKey = preferences.apiKey;
  }

  // Getter für baseURL (wird in search-tickets.tsx verwendet)
  get baseURL(): string {
    return this._baseURL;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this._baseURL}/api/v3${endpoint}`;

    const response = (await fetch(url, {
      ...options,
      headers: {
        Authorization: `Basic ${Buffer.from(`apikey:${this.apiKey}`).toString("base64")}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })) as Response;

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenProject API error: ${response.status} ${response.statusText}`;

      // Spezielle Behandlung für 409 Conflicts
      if (response.status === 409) {
        errorMessage = "Conflict: Ticket was modified by someone else or is locked";
      }

      // Versuche JSON Error Details zu parsen
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage += ` - ${errorData.message}`;
        }
      } catch {
        // Ignoriere JSON Parse Fehler
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getProjects(): Promise<Project[]> {
    const response: any = await this.makeRequest("/projects");
    return response._embedded?.elements || [];
  }

  async getWorkPackageTypes(): Promise<WorkPackageType[]> {
    const response: any = await this.makeRequest("/types");
    return response._embedded?.elements || [];
  }

  async getUsers(): Promise<User[]> {
    const response: any = await this.makeRequest("/users");
    return response._embedded?.elements || [];
  }

  async getPriorities(): Promise<Priority[]> {
    const response: any = await this.makeRequest("/priorities");
    return response._embedded?.elements || [];
  }

  async updateWorkPackage(data: UpdateWorkPackageRequest): Promise<WorkPackage> {
    // Erst aktuelles Ticket laden für lockVersion
    const currentTicket = await this.getWorkPackage(data.id);

    const payload: any = {
      lockVersion: currentTicket.lockVersion || 0, // Wichtig für Conflict-Vermeidung
    };

    if (data.subject && data.subject !== currentTicket.subject) {
      payload.subject = data.subject;
    }
    if (data.description && data.description !== currentTicket.description?.raw) {
      payload.description = { raw: data.description };
    }

    const links: any = {};
    if (data.assigneeId && data.assigneeId !== currentTicket.assignee?.id) {
      links.assignee = { href: `/api/v3/users/${data.assigneeId}` };
    }
    if (data.priorityId && data.priorityId !== currentTicket.priority?.id) {
      links.priority = { href: `/api/v3/priorities/${data.priorityId}` };
    }
    if (data.statusId && data.statusId !== currentTicket.status?.id) {
      links.status = { href: `/api/v3/statuses/${data.statusId}` };
    }

    if (Object.keys(links).length > 0) {
      payload._links = links;
    }

    // Wenn keine Änderungen, return current ticket
    if (Object.keys(payload).length === 1) {
      // nur lockVersion
      return currentTicket;
    }

    try {
      return await this.makeRequest(`/work_packages/${data.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          "If-Match": currentTicket.lockVersion?.toString() || "0",
        },
      });
    } catch (error: any) {
      if (error.message?.includes("409")) {
        throw new Error("Ticket was modified by someone else. Please try again.");
      }
      throw error;
    }
  }

  async getStatuses(): Promise<Status[]> {
    const response: any = await this.makeRequest("/statuses");
    return response._embedded?.elements || [];
  }

  async createWorkPackage(data: CreateWorkPackageRequest): Promise<WorkPackage> {
    const payload = {
      subject: data.subject,
      description: {
        raw: data.description || "",
      },
      _links: {
        project: {
          href: `/api/v3/projects/${data.projectId}`,
        },
        type: {
          href: `/api/v3/types/${data.typeId}`,
        },
        ...(data.assigneeId && {
          assignee: {
            href: `/api/v3/users/${data.assigneeId}`,
          },
        }),
        ...(data.priorityId && {
          priority: {
            href: `/api/v3/priorities/${data.priorityId}`,
          },
        }),
      },
    };

    return await this.makeRequest("/work_packages", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async searchWorkPackages(query: string): Promise<WorkPackage[]> {
    const encodedQuery = encodeURIComponent(query);
    const response: any = await this.makeRequest(
      `/work_packages?filters=[{"subject":{"operator":"~","values":["${encodedQuery}"]}}]`,
    );
    return response._embedded?.elements || [];
  }

  async getWorkPackage(id: number): Promise<WorkPackage> {
    return await this.makeRequest(`/work_packages/${id}`);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest("/");
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default OpenProjectAPI;
