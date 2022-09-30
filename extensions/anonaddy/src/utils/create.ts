import { getApiKey } from "./key";
import fetch from "node-fetch";
import { showHUD } from "@raycast/api";

interface creationResponse {
  data: {
    id: string;
    email: string;
  };
}

export const createAlias = async () => {
  const res = await fetch(`https://app.anonaddy.com/api/v1/aliases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
      "X-Requested-With": "XMLHttpRequest",
      Accept: "application/json",
    },
    body: JSON.stringify({
      domain: "anonaddy.me",
    }),
  });

  if (res.status === 401) {
    await showHUD("❌ AnonAddy API credentials are invalid");
    return {} as any;
  }

  const data = (await res.json()) as creationResponse;

  return data.data;
};
