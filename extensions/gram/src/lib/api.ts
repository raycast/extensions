import { showToast, Toast } from "@raycast/api";

export async function apiFetch(url: string | URL, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...options.headers,
    "User-Agent": "Raycast-Gram-Extension-Manager/1.0",
    "Content-Type": "application/json",
  };

  const updatedOptions: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url.toString(), { ...updatedOptions });

    if (!response.ok) {
      if (response.status === 429) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Rate Limited",
          message: "Too many requests to the API. Please try again later.",
        });
      } else if (response.status === 404) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Not Found",
          message: "The requested extension or data could not be found.",
        });
      } else if (response.status >= 500) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Server Error",
          message: "The API is currently experiencing downtime. Try again later.",
        });
      }

      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    if (error instanceof TypeError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Network Error",
        message: "Failed to connect. Please check your internet connection.",
      });
    }

    console.error("Global API Fetch Error:", error);
    throw error;
  }
}
