import { LocalStorage, showToast, Toast } from "@raycast/api";

export const DEFAULT_ZONE_ID = "WLY01";

export async function fetchResource<T>(
  url: string,
  errorTitle: string,
  parseResponse: (response: Response) => Promise<T>,
): Promise<T | undefined> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return await parseResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error";
    console.error(errorTitle, error);

    await showToast({
      style: Toast.Style.Failure,
      title: errorTitle,
      message,
    });
  }
}

export async function loadCached<T>(
  key: string,
  load: () => Promise<T | undefined>,
  shouldRefresh = false,
): Promise<T | undefined> {
  const raw = await LocalStorage.getItem<string>(key);

  if (raw && !shouldRefresh) {
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`Unable to parse cached data for ${key}`, error);
      await LocalStorage.removeItem(key);
    }
  }

  const result = await load();
  if (result) {
    await LocalStorage.setItem(key, JSON.stringify(result));
    return result;
  }
}
