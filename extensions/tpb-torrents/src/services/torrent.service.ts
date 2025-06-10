import { BaseTorrent, TorrentDetail } from "../types/torrent.types";
import { API_ENDPOINTS } from "../constants/api.constants";

export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response,
  ) {
    super(message);
    this.name = "APIError";
  }
}

class TorrentAPIService {
  private async makeRequest<T>(url: string, signal?: AbortSignal): Promise<T> {
    try {
      const response = await fetch(url, { signal });

      if (!response.ok) {
        throw new APIError(`HTTP ${response.status}: ${response.statusText}`, response.status, response);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }

      throw new APIError("Network request failed", 0);
    }
  }

  async searchTorrents(query: string, signal?: AbortSignal): Promise<BaseTorrent[]> {
    const data = await this.makeRequest<BaseTorrent[]>(API_ENDPOINTS.search(query), signal);

    return Array.isArray(data) ? data : [];
  }

  async getTorrentDetail(id: string, signal?: AbortSignal): Promise<TorrentDetail> {
    return this.makeRequest<TorrentDetail>(API_ENDPOINTS.torrentDetail(id), signal);
  }
}

export const torrentAPI = new TorrentAPIService();
