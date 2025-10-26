import { showFailureToast, useCachedPromise, useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "../utils/constants";
import { showToast, Toast } from "@raycast/api";
import { ErrorResponse, GetAPIKeysResponse } from "../utils/types";
import { resend } from "./resend";

const useResend = <T>(
  endpoint: string,
  { animatedToastMessage, onData }: { animatedToastMessage: string; onData?: (data: T) => void } = {
    animatedToastMessage: "",
  },
) =>
  useFetch(API_URL + endpoint, {
    method: "GET",
    headers: API_HEADERS,
    async onWillExecute() {
      await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);
    },
    async parseResponse(response) {
      if (!response.ok) {
        const result = (await response.json()) as ErrorResponse;
        throw new Error(result.message, { cause: result.name });
      }
      // if (apiResponse.headers.get("content-length") == "0") return {};
      const result = (await response.json()) as T;
      return result;
    },
    async onError(error) {
      await showToast(Toast.Style.Failure, String(error.cause ?? "Something went wrong"), error.message);
    },
    onData,
});

const showSuccessToast = async (items: unknown[], singular: string, plural=`${singular}s`) => {
  const numOfItems = items.length;
  await showToast(Toast.Style.Success, "Success", `Fetched ${numOfItems} ${numOfItems===1 ? singular : plural}`);
}
export const onError = async (error: Error) => {
  await showFailureToast(error, {title: String(error.cause ?? "Something went wrong")});
}
export const useGetDomains = () => {
  const { data, ...rest } = useCachedPromise(async () => {
    await showToast(Toast.Style.Animated, "Processing...", "Fetching Domains");
    const res = await resend.domains.list();
    if (res.error) throw new Error(res.error.message, {cause: res.error.name});
    const data = res.data?.data ?? [];
    await showSuccessToast(data, "domain");
    return data;
  }, [], {
    initialData: [],
    onError,
  })

  return { domains: data, ...rest };
}

export const useGetAPIKeys = () => {
  const { data, ...rest } = useCachedPromise(async () => {
    await showToast(Toast.Style.Animated, "Processing...", "Fetching API Keys");
    const res = await resend.apiKeys.list();
    if (res.error) throw new Error(res.error.message, {cause: res.error.name});
    const data = res.data.data ?? [];
    await showSuccessToast(data, "api key");
    return data;
  }, [], {
    initialData: [],
    onError,
  })
  return {keys: data, ...rest};
};

export const useEmails = () => {
  const { data, ...rest } = useCachedPromise(async () => {
    await showToast(Toast.Style.Animated, "Processing...", "Fetching Emails");
    const res = await resend.emails.list();
    if (res.error) throw new Error(res.error.message, {cause: res.error.name});
    const data = res.data.data ?? [];
    await showSuccessToast(data, "email");
    return data;
  }, [], {
    initialData: [],
    onError,
  })
  return {emails: data, ...rest};
};
