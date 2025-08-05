import { Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { ACCESS_KEY, SECRET_KEY } from "../../constants";
import { generateApiUrl } from "..";

export default function useHestia<T>(
  cmd: string,
  animatedToastMessage = "",
  options?: { body?: string[]; onData?: (data: T) => void; onError?: () => void; execute?: boolean },
) {
  const API_URL = generateApiUrl();
  const API_METHOD = "POST";
  const HASH = `${ACCESS_KEY}:${SECRET_KEY}`;

  const { body = [], execute = true } = options || {};

  // we need to pass args like { arg1: first, arg2: second }
  const args =
    body.reduce(
      (acc, cur, index) => {
        acc[`arg${index + 1}`] = cur;
        return acc;
      },
      {} as { [key: string]: string },
    ) || {};
  // and we need the last one to be 'arg[last]: json' so we get JSON
  if (!cmd.includes("v-add")) args[`arg${body.length + 1}`] = "json";

  const { data, isLoading, revalidate, error } = useFetch(API_URL, {
    method: API_METHOD,
    body: JSON.stringify({
      hash: HASH,
      cmd,
      ...args,
      // e.g.
      // cmd: "v-list-user-stats"
      // arg1: "admin"
      // arg2: "json"
    }),
    execute,
    async parseResponse(response) {
      const { status } = response;
      if (!response.ok) {
        const error = `${status} Error`;
        const code = response.headers.get("Hestia-Exit-Code");
        const result = await response.text();
        throw new Error(`${code} - ${result}`, { cause: error });
      } else {
        if (status === 204) return {} as T;
        const result = await response.json();
        return result as T;
      }
    },
    async onWillExecute() {
      await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);
    },
    async onData(data) {
      await showToast(Toast.Style.Success, "SUCCESS");
      options?.onData?.(data);
    },
    async onError(error) {
      const title = error.cause?.toString() || "Something went wrong";
      await showFailureToast(error, {
        title,
        primaryAction: !title.includes("401")
          ? undefined
          : {
              title: "Open Extension Preferences",
              async onAction() {
                await openExtensionPreferences();
              },
            },
      });
      options?.onError?.();
    },
  });
  return { data, isLoading, revalidate, error };
}
