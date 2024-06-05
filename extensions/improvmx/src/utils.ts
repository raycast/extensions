import { Color, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { showFailureToast, useFetch } from "@raycast/utils";
// import fetch from "node-fetch";
import { randomInt } from "node:crypto";
import { API_HEADERS, API_URL } from "./constants";
import { Account, ErrorResponse } from "./types";

interface Domain {
  display: string;
  banned?: boolean;
  active?: boolean;
}

const fetchAccountAPI = async () => {
  // const { data } = useImprovMX<{ account: Account }>("account");
  // const { data } = useFetch("account", {
  //   headers: API_HEADERS,
  //   async parseResponse(response) {
  //     return await parseImprovMXResponse<{ account: Account }>(response, false);
  //   },
  //   mapResult(result) {
  //     return {
  //       data: result.data
  //     }
  //   },
  //   async onData(data) {
  //     const { email, plan } = data.account;
  //     await LocalStorage.setItem("improvmx_email", email);
  //     await LocalStorage.setItem("improvmx_unix_timestamp", Math.floor(Date.now() / 1000));

  //     if (plan) {
  //       await LocalStorage.setItem("improvmx_plan", plan.name);
  //     } else {
  //       await LocalStorage.setItem("improvmx_plan", "Free");
  //     }
  //   }
  // });
  // return data?.account.email
  try {
    const apiResponseAccount = await fetch(API_URL + "account", {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const apiResponseJSON: any = await apiResponseAccount.json();

    if (apiResponseJSON.success === false) {
      const errorMessage = apiResponseJSON.error ?? "ImprovMX API Error";
      await showToast(Toast.Style.Failure, "ImprovMX Error", errorMessage);
      return;
    }

    const { email, plan } = apiResponseJSON.account ?? {};

    if (email) {
      await LocalStorage.setItem("improvmx_email", email);
      await LocalStorage.setItem("improvmx_unix_timestamp", Math.floor(Date.now() / 1000));

      if (plan) {
        await LocalStorage.setItem("improvmx_plan", plan.name);
      } else {
        await LocalStorage.setItem("improvmx_plan", "Free");
      }

      return email;
    } else {
      const errorMessage = "Failed to parse ImprovMX API response";
      await showToast(Toast.Style.Failure, "ImprovMX Error", errorMessage);
      return;
    }
  } catch (error) {
    showToast(Toast.Style.Failure, "ImprovMX Error", "Failed to fetch account details, please check your API key");
    return;
  }
};

const fetchAccont = async (auth: string, API_URL: string) => {
  const improvmx_email = await LocalStorage.getItem("improvmx_email");
  const improvmx_unix_timestamp = (await LocalStorage.getItem("improvmx_unix_timestamp")) as number;

  if (improvmx_unix_timestamp && improvmx_email) {
    const current_unix_timestamp = Math.floor(Date.now() / 1000);
    const difference = current_unix_timestamp - improvmx_unix_timestamp;
    const hours = Math.floor(difference / 3600);
    if (hours < 24) {
      return improvmx_email;
    } else {
      return fetchAccountAPI();
    }
  } else {
    return fetchAccountAPI();
  }
};

const domainIcon = (domain: Domain) => {
  if (domain.banned || domain.active == false) {
    return { source: Icon.Dot, tintColor: Color.Red };
  } else {
    return { source: Icon.Dot, tintColor: Color.Green };
  }
};

const generatePassword = () => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array(12)
    .fill(chars)
    .map(function (x) {
      return x[randomInt(x.length)];
    })
    .join("");
};

const useImprovMX = <T>(endpoint: string) => {
  // const { isLoading, data, error, revalidate } = useFetch(API_URL + endpoint, {
  //   method: body ? "POST" : "GET",
  //   headers: API_HEADERS,
  //   body: JSON.stringify(body) || undefined,
  //   execute: body ? false : true,
  //   async parseResponse(response) {
  //     return await parseImprovMXResponse<T>(response, false);
  //   },
  //   mapResult(result) {
  //     return {
  //       data: result.data
  //     }
  //   },
  // });
  // return { isLoading, data, error, revalidate };
  const { isLoading, data, error } = useFetch(API_URL + endpoint, {
    headers: API_HEADERS,
    async parseResponse(response) {
      return await parseImprovMXResponse<T>(response, false);
    },
    mapResult(result) {
      return {
        data: result.data
      }
    },
  });
  return { isLoading, data, error };
}

export async function parseImprovMXResponse<T>(response: Response, pagination=true) {
  type PageMeta = {
    total: number;
    limit: number;
    page: number;
  }
  type SuccessResponse = {
      success: true;
  } & T;

  if (!response.ok) {
    const result = await response.json() as ErrorResponse;
    if (result.code===401) throw new Error("Invalid API Token");
    
    if ("error" in result) throw new Error(result.error);
    else if ("errors" in result) throw new Error(Object.values(result.errors).flat()[0]);
    throw new Error("There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Improvmx Dashboard](https://improvmx.com/dashboard). If you need help, please contact support@improvmx.com");
    // if (Object.hasOwn(result, "error")) throw new Error(result.error);
    // if (Object.hasOwn(result, "errors")) throw new Error(Object.values(result.errors).flat()[0]);
    // console.log(result);
    // throw new Error(result.error || result.errors?.[0] || "There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Improvmx Dashboard](https://improvmx.com/dashboard). If you need help, please contact support@improvmx.com");
  }
  if (pagination) {
    const result = await response.json() as (SuccessResponse & PageMeta);
    return {
      data: result,
      hasMore: (result.page * result.limit) >= result.total
    };
  } else {
    const result = await response.json() as SuccessResponse;
    return {
      data: result
    };
  }
}
export async function onError() {
  // await showFailureToast("Failed to fetch domains. Please try again later.", { title: "ImprovMX Error" })
  await showFailureToast("Please try again later.", { title: "ImprovMX Error" })
}

export { fetchAccont, domainIcon, generatePassword, fetchAccountAPI, useImprovMX };
