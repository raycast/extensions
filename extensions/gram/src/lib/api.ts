import { showToast, Toast } from "@raycast/api";

interface ApiFetchOptions extends RequestInit {
  silent?: boolean;
}

export async function apiFetch(url: string | URL, options: ApiFetchOptions = {}): Promise<Response> {
  const { silent = false, ...requestOptions } = options;

  const headers = {
    ...requestOptions.headers,
    "User-Agent": "Raycast-Gram-Extension-Manager/1.0",
    "Content-Type": "application/json",
  };

  const updatedOptions: RequestInit = {
    ...requestOptions,
    headers,
  };

  try {
    const response = await fetch(url.toString(), { ...updatedOptions });

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;

      if (response.status === 429) {
        errorMessage = "Rate Limited: Too many requests to the API. Please try again later.";
        if (!silent) await showToast({ style: Toast.Style.Failure, title: "Rate Limited", message: errorMessage });
      } else if (response.status === 404) {
        errorMessage = "Not Found: The requested extension or data could not be found.";
        if (!silent) await showToast({ style: Toast.Style.Failure, title: "Not Found", message: errorMessage });
      } else if (response.status >= 500) {
        errorMessage = "Server Error: The API is currently experiencing downtime. Try again later.";
        if (!silent) await showToast({ style: Toast.Style.Failure, title: "Server Error", message: errorMessage });
      } else if (!silent) {
        await showToast({ style: Toast.Style.Failure, title: "Request Failed", message: errorMessage });
      }

      throw new Error(errorMessage);
    }

    return response;
  } catch (error) {
    if (error instanceof TypeError) {
      const networkError = "Failed to connect. Please check your internet connection.";
      if (!silent) {
        await showToast({ style: Toast.Style.Failure, title: "Network Error", message: networkError });
      }
      throw new Error(networkError);
    }

    console.error("Global API Fetch Error:", error);
    throw error;
  }
}
