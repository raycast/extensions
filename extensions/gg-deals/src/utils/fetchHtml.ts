import { showToast, Toast } from "@raycast/api";
import axios from "axios";
import UserAgent from "user-agents";
import { baseUrl } from "./constants";

export async function fetchHtml(url: string, signal?: AbortSignal): Promise<string> {
  try {
    const result = await axios.get(`${url}`, {
      headers: {
        "User-Agent": new UserAgent().toString(),
        origin: baseUrl,
        referer: baseUrl,
      },
      timeout: 20000,
      signal,
    });
    return result.data;
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Error fetching game details:", message: String(error) });
    throw error;
  }
}
