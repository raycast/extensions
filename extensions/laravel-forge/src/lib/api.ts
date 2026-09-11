import { LaunchType, LocalStorage, Toast, captureException, environment, popToRoot, showToast } from "@raycast/api";
import { clearCache } from "./cache";
import { politeFetch } from "./limit";

// doTheFetch puts the status at the front of the message it throws
export const isStatus = (error: unknown, ...codes: number[]) => {
  const message = error instanceof Error ? error.message : "";
  return codes.some((code) => new RegExp(`^${code}\\b`).test(message));
};

const doTheFetch = async (url: string, options?: RequestInit) => {
  // A tool's thrown message already reaches the model; a toast on top is noise
  const silent = environment.launchType === LaunchType.Background || environment.entryPointType === "tool";
  let res;
  try {
    res = await politeFetch(url, options);
  } catch (e) {
    if (e instanceof Error) {
      console.error({ error: e, url });
      captureException(e);
      if (!silent) showResetToast({ title: `Error ${res?.status}: ${e.message}` });
      throw new Error(e.message);
    }
  }
  if (!res?.ok) {
    console.error({ status: res?.status, text: res?.statusText, url });
    const rejectedToken = res?.status === 401 || res?.status === 403;
    const title = rejectedToken
      ? "Forge rejected the API token. Create a v2 token with the scopes you need."
      : `Error ${res?.status}: ${res?.statusText}`;
    if (!silent) showResetToast({ title });
    captureException(new Error(`${res?.status} ${res?.statusText}: ${url}`));
    // Forge explains itself in the body: a 400 names the filters it does allow
    const detail = await res
      ?.text()
      .then((body) => {
        try {
          return String((JSON.parse(body) as { message?: string }).message ?? body);
        } catch {
          return body;
        }
      })
      .catch(() => "");
    throw new Error(
      [`${res?.status ?? "network"} ${res?.statusText || "request failed"}: ${url}`, detail?.slice(0, 300)]
        .filter(Boolean)
        .join(". "),
    );
  }
  return res;
};

export const apiFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await doTheFetch(url, options);
  if (!res?.ok) return {} as T;
  return (await res.json()) as T;
};

export const apiFetchText = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await doTheFetch(url, options);
  if (!res?.ok) return "" as T;
  return (await res.text()) as T;
};

const showResetToast = ({ title }: { title: string }) =>
  showToast({
    style: Toast.Style.Failure,
    title,
    primaryAction: {
      title: "Reset cache",
      onAction: async () => {
        // not working?
        await clearCache();
        await LocalStorage.clear();
        await showToast(Toast.Style.Success, "Cache cleared");
        popToRoot({ clearSearchBar: true });
      },
    },
  });
