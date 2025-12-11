import { getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export default function useClickUp<T>(endpoint: string, { apiVersion }: { apiVersion: 2 | 3 } = { apiVersion: 2 }) {
  const { isLoading, data } = usePromise(
    async () => {
      const prefs = getPreferenceValues<Preferences>();
      const url = `https://api.clickup.com/api/v${apiVersion}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          Authorization: prefs.token,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { err?: string; ECODE?: string };
        if (errorData.err) {
          throw new Error(`${errorData.err} (${errorData.ECODE})`);
        }
        throw new Error(`Request failed with status ${response.status}`);
      }

      return (await response.json()) as T;
    },
    [],
    {
      failureToastOptions: {
        title: "ClickUp Error",
      },
    },
  );
  return { isLoading, data };
}
