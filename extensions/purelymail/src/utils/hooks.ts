import { Domain, RequestBody, Response, Rule } from "./types";
import fetch from "node-fetch";
import { API_HEADERS, API_METHOD, API_URL } from "./constants";
import { Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

type CallApi = {
  body?: RequestBody;
  animatedToastMessage?: string;
  successToastMessage?: string;
  hideToasts?: boolean;
};
export const callApi = async <T>(
  endpoint: string,
  { body = {}, animatedToastMessage = "", successToastMessage = "", hideToasts = false }: CallApi = {},
) => {
  if (!hideToasts && animatedToastMessage) await showToast(Toast.Style.Animated, "Processing...", animatedToastMessage);

  const apiResponse = await fetch(API_URL + endpoint, {
    method: API_METHOD,
    headers: API_HEADERS,
    body: JSON.stringify(body),
  });

  if (!apiResponse.ok) {
    throw new Error(
      "There was an error with your request. Make sure you are connected to the internet. Please check that your API Token is correct and up-to-date. You can find your API Token in your [Purelymail Account](https://purelymail.com/manage/account). If you need help, please contact support@purelymail.com",
      {
        cause: "purelymailError",
      },
    );
  }

  const response = (await apiResponse.json()) as Response;
  if (response.type === "error") throw new Error(response.message, { cause: response.code });
  if (!hideToasts && successToastMessage) await showToast(Toast.Style.Success, "SUCCESS", successToastMessage);
  return response.result as T;
};

export const useUsers = () =>
  useCachedPromise(
    async () => {
      const result = await callApi<{ users: string[] }>("listUser");
      return result.users;
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
    },
  );

export const useRoutingRules = () =>
  useCachedPromise(
    async () => {
      const result = await callApi<{ rules: Rule[] }>("listRoutingRules");
      return result.rules;
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
    },
  );

export const useOwnershipCode = () =>
  useCachedPromise(async () => (await callApi<{ code: string }>("getOwnershipCode")).code, [], {
    keepPreviousData: true,
  });

export const useDomains = ({ includeShared = false } = {}) =>
  useCachedPromise(
    async () => {
      const body = { includeShared };
      const result = await callApi<{ domains: Domain[] }>("listDomains", { body });
      return result.domains;
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
    },
  );
