import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "../utils/constants";
import { showToast, Toast } from "@raycast/api";
import { ErrorResponse, GetDomainsResponse } from "../utils/types";

const useResend = <T>(
  endpoint: string,
  { animatedToastMessage, onData }: { animatedToastMessage: string; onData?: (data: T) => void } = {
    animatedToastMessage: "",
  }
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

export const useGetDomains = () => {
  const { data, ...rest } = useResend<GetDomainsResponse>("domains", {
    animatedToastMessage: "Fetching Domains",
    async onData(data) {
      const numOfDomains = data.data.length;
      await showToast({
        title: "Success",
        message: `Fetched ${numOfDomains} ${numOfDomains === 1 ? "domain" : "domains"}`,
        style: Toast.Style.Success,
      });
    },
  });
  const domains = data?.data ?? [];
  return { domains, ...rest };
};
