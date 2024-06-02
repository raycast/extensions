import { showFailureToast, useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "../constants";
import { Domain, ErrorResponse } from "../types";

export const useImprovMXPaginated = <T>(endpoint: string) => {
    type SuccessResponse = {
        total: number;
        limit: number;
        page: number;
        success: true;
    } & T;
    const { isLoading, data, pagination } = useFetch(API_URL + endpoint, {
      headers: API_HEADERS,
      // parseResponse(response) {
      //   const result = await response.json();
      //   if (!response.ok) {
      //     throw new Error(`${response.status} ${response.statusText}`, {
      //       cause: result.
      //     })
      //   }
      // },
      async parseResponse(response) {
        if (!response.ok) {
          const result = await response.json() as ErrorResponse;
          if (result.code===401) throw new Error("Invalid API Token");
          throw new Error("There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Improvmx Dashboard](https://improvmx.com/dashboard). If you need help, please contact support@improvmx.com");
        }
        const result = await response.json() as SuccessResponse;
        return result;
      },
      mapResult(result) {
        const hasMore = (result.page * result.limit) >= result.total;
        switch (endpoint) {
            case "domains":
                return {
                    data: (result as unknown as { domains: Domain[] }).domains,
                    hasMore
                }
            default:
                return {
                    data: [],
                    hasMore: false
                }
        }
      },
      async onError() {
        // await showFailureToast("Failed to fetch domains. Please try again later.", { title: "ImprovMX Error" })
        await showFailureToast("Please try again later.", { title: "ImprovMX Error" })
      },
      initialData: []
    });
    return { isLoading, data, pagination };
  }