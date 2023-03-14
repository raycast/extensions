import { join, normalize } from "path";
import fetch from "node-fetch";
import { Announcement, Service, Track, TrackTypeName } from "./types/common";
import * as fluent from "./types/fluent";

type FluentTracksResponse = { type: string; features: fluent.Feature[] };

export class FluentClient {
  constructor(private service: Service) {}

  /**
   * Get service / city info
   */
  async getInfo() {
    return await this.fetch<fluent.Environment>(this.getUrl("/api/public/environment"));
  }

  /** Get service level announcements */
  async getAnnouncements(): Promise<Announcement[]> {
    const notices = await this.fetch<fluent.Notice[]>(this.getUrl("/api/public/notice/list"));

    return notices.map((notice) => {
      const announcement: Announcement = {
        id: notice.id,
        title: notice.title,
        description: notice.description,
        start: new Date(notice.start),
        end: new Date(notice.end),
        linkBody: notice.linkBody ? notice.linkBody : undefined,
        linkUrl: notice.linkUrl ? notice.linkUrl : undefined,
      };

      return announcement;
    });
  }

  /**
   * Get track maintenance info for all
   * tracks within service
   */
  async getTracks(): Promise<Track[]> {
    try {
      const response = await this.fetch<FluentTracksResponse>(this.getUrl("/api/public/venue/list"));
      return (response as FluentTracksResponse).features.map((feature) => {
        const { id, name, description, status, maintenance, type } = feature.properties;
        return {
          id,
          serviceId: this.service.id,
          service: this.service,
          type: type as TrackTypeName,
          name,
          description,
          maintenanceDate: this.getLatestDate([maintenance.kunto, maintenance.manual, maintenance.manual]),
          status: (status as string).toLocaleString() as fluent.Status,
        };
      });
    } catch (error) {
      throw new Error("Failed to fetch tracks");
    }
  }

  private async fetch<Data>(url: string, timeout = 5000) {
    const data = await Promise.race([
      (async () => {
        const response = await fetch(url);
        return response.json() as Data;
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Failed to fetch data")), timeout)),
    ]);

    return data as Data;
  }

  private getUrl(path: string): string {
    return normalize(join(this.service.url, path));
  }

  private getLatestDate(entries: (Date | string | undefined)[]) {
    let smallestDate: Date | null = null;

    entries.filter(Boolean).forEach((entry) => {
      const date = new Date(entry as string);
      if (smallestDate === null || date.valueOf() > smallestDate.valueOf()) {
        smallestDate = date;
      }
    });

    return smallestDate;
  }
}
