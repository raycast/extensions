import { showFailureToast, useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL } from "../constants";
import { Domain, ErrorResponse } from "../types";
import { parseImprovMXResponse } from "../utils";

export const useImprovMXPaginated = <T, K extends string>(endpoint: string) => {
  type SuccessResponse = {
    total: number;
    limit: number;
    page: number;
    success: true;
  } & {
    [key in K]: T[]
  };
    
    const { isLoading, error, data, pagination } = useFetch(
      (options) =>
        API_URL + endpoint + "?" +
        new URLSearchParams({ page: String(options.page + 1) }).toString(), {
      headers: API_HEADERS,
      async parseResponse(response) {
        // if (!response.ok) {
        //   const result = await response.json() as ErrorResponse;
        //   if (result.code===401) throw new Error("Invalid API Token");
          
        //   if ("error" in result) throw new Error(result.error);
        //   else if ("errors" in result) throw new Error(Object.values(result.errors).flat()[0]);
        //   throw new Error("There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Improvmx Dashboard](https://improvmx.com/dashboard). If you need help, please contact support@improvmx.com");
        //   // if (Object.hasOwn(result, "error")) throw new Error(result.error);
        //   // if (Object.hasOwn(result, "errors")) throw new Error(Object.values(result.errors).flat()[0]);
        //   // console.log(result);
        //   // throw new Error(result.error || result.errors?.[0] || "There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Improvmx Dashboard](https://improvmx.com/dashboard). If you need help, please contact support@improvmx.com");
        // }
        // const result = await response.json() as SuccessResponse;
        // return {
        //   data: result,
        //   hasMore: (result.page * result.limit) >= result.total
        // };
        // return await parseImprovMXResponse<{ domains: Array<Domain> }>(response);
        return await parseImprovMXResponse<{ K: T[] }>(response);
      },
      mapResult(result) {
        const key = endpoint.split("/").at(-1);
        return {
          data: result.data[key as keyof typeof result.data] as T[],
          hasMore: result.hasMore
        }
      },
      initialData: []
    })
    
    // const { isLoading, data, pagination } = useFetch(API_URL + endpoint, {
    //   headers: API_HEADERS,
    //   async parseResponse(response) {
    //     if (!response.ok) {
    //       const result = await response.json() as ErrorResponse;
    //       if (result.code===401) throw new Error("Invalid API Token");
    //       throw new Error("There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Improvmx Dashboard](https://improvmx.com/dashboard). If you need help, please contact support@improvmx.com");
    //     }
    //     const result = await response.json() as SuccessResponse;
    //     return result;
    //   },
    //   mapResult(result) {
    //     const hasMore = (result.page * result.limit) >= result.total;
    //     switch (endpoint) {
    //         case "domains":
    //             return {
    //                 data: (result as unknown as { domains: Domain[] }).domains,
    //                 hasMore
    //             }
    //         default:
    //             return {
    //                 data: [],
    //                 hasMore: false
    //             }
    //     }
    //   },
    //   async onError() {
    //     // await showFailureToast("Failed to fetch domains. Please try again later.", { title: "ImprovMX Error" })
    //     await showFailureToast("Please try again later.", { title: "ImprovMX Error" })
    //   },
    //   initialData: []
    // });
    return { isLoading, error, data, pagination };
  }