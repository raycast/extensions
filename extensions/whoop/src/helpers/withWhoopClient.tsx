import { withAccessToken } from "@raycast/utils";
import { provider } from "../api/oauth";
import * as api from "../helpers/whoop.api";
import nodeFetch from "node-fetch";

export let whoopClient: typeof api | undefined;

provider.onAuthorize = ({ token }) => {
  api.defaults.headers = {
    Authorization: `Bearer ${token}`,
  };

  api.defaults.fetch = nodeFetch as unknown as typeof fetch;

  whoopClient = api;
};

export const withWhoopClient = withAccessToken(provider);

export function getWhoopClient() {
  if (!whoopClient) {
    throw new Error("getWhoopClient must be used when authenticated");
  }

  return {
    whoopClient,
  };
}

export async function setWhoopClient() {
  const accessToken = await provider.authorize();

  api.defaults.headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  api.defaults.fetch = nodeFetch as unknown as typeof fetch;

  whoopClient = api;
}
