import fetch from "node-fetch";
import { LocalStorage, Toast, showToast } from "@raycast/api";
import { errorConnectionMessage } from "./constants";

interface FetchOptions {
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

export async function apiFetch<T>(url: string, options: FetchOptions): Promise<T> {
  try {
    const response = await fetch(url, {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await LocalStorage.getItem("app_key")}`,
        ...options.headers,
      },
      body: options.body,
    });

    if (!response.ok) {
      if (response.status === 429) {
        await showToast(Toast.Style.Failure, "Rate Limit Exceeded", "Please try again later.");
      } else if (response.status === 403) {
        throw new Error("Operation not permitted.");
      } else {
        throw new Error(`API request failed: [${response.status}] ${response.statusText} ${await response.text()}`);
      }
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new Error("Failed to parse JSON response");
    }
  } catch (error) {
    if (error instanceof Error && (error as { code?: string }).code === "ECONNREFUSED") {
      throw new Error(errorConnectionMessage);
    }
    throw error;
  }
}
