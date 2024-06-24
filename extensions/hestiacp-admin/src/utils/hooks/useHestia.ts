import { Toast, showToast } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
import { ACCESS_KEY, HOSTNAME, SECRET_KEY } from "../../constants";

export default function useHestia<T>(cmd: string, animatedToastMessage = "", options?: {body?: string[], onData?: (data: T) => void, execute?: boolean}) {

  // the only reason for a try,catch is to ensure HestiaCP URL is Valid.
  try {
    const API_URL = new URL('api/', HOSTNAME);
    const API_METHOD = "POST";

    const { body = undefined, execute = true } = options || {};
    
    // we need to pass args like { arg1: first, arg2: second }
    const args = body?.reduce((acc, cur, index) => {
      acc[`arg${index + 1}`] = cur;
      return acc;
    }, {} as { [key: string]: string }) || {};
    // and we need the last one to be 'arg[last]: json' so we get JSON
    if (body) args[`arg${body.length+1}`] = "json";
    else args["arg1"] = "json";

    const { data, isLoading, revalidate, error } = useFetch(API_URL.toString(), {
        method: API_METHOD,
        body: JSON.stringify({
            hash: `${ACCESS_KEY}:${SECRET_KEY}`,
            cmd,
            ...args
        }),
        execute,
        async parseResponse(response) {
          const { status } = response;
          if (!response.ok) {
              const error = `${status} Error`;
              const code = response.headers.get('Hestia-Exit-Code');
              const result = await response.text();
              throw new Error(`${code} - ${result}`, { cause: error });
            } else {
              if (status===204) return {} as T;
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
        }
    })
    return { data, isLoading, revalidate, error };
  } catch (error) {
    showFailureToast(error);
    return { isLoading: false, error: error as Error }
  }
}