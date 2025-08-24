import axios, { AxiosInstance } from "axios";
import UserAgent from "user-agents";
import { HltbSearch } from "./hltbsearch";

export class ApiService {
  private static instance: AxiosInstance;

  // Method to get or create the singleton instance
  public static getInstance(): AxiosInstance {
    if (!this.instance) {
      this.instance = axios.create({
        baseURL: HltbSearch.BASE_URL,
        headers: {
          "content-type": "application/json",
          origin: HltbSearch.BASE_URL,
          referer: HltbSearch.BASE_URL,
          "User-Agent": new UserAgent().toString(),
        },
      });
    }
    return this.instance;
  }
}
