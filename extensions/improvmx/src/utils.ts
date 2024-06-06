import { Color, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fetch from "node-fetch";
import { randomInt } from "node:crypto";
import { API_HEADERS, API_URL } from "./constants";
import { Account, Domain, ErrorResponse } from "./types";

const fetchAccountAPI = async () => {
  try {
    const response = await fetch(API_URL + "account", {
      headers: API_HEADERS
    });
    // @ts-expect-error Response type is incompatible
    const result = await parseImprovMXResponse<{ account: Account }>(response, { pagination: false });

    const { email, plan } = result.data.account;

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

const fetchAccount = async () => {
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

export async function parseImprovMXResponse<T>(response: Response, options={pagination: true}) {
  const { pagination } = options;

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

export { fetchAccount, domainIcon, generatePassword, fetchAccountAPI };
