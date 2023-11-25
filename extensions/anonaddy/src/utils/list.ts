import { showToast, Toast } from "@raycast/api";
import { getApiKey } from "./key";
import fetch from "node-fetch";
export interface aliasObject {
  id: string;
  email: string;
  active: boolean;
  description: string | null;
  emails_sent: number;
  emails_blocked: number;
  emails_forwarded: number;
  emails_replied: number;
}

interface listResponse {
  data: aliasObject[];
  meta: {
    total: number;
  };
}

export const listAllAliases = async () => {
  let pageNum = 1;
  let totalPages: number | undefined = undefined;
  let allAliases: aliasObject[] = [];

  while (totalPages === undefined || pageNum <= totalPages) {
    const res = await fetch(`https://app.anonaddy.com/api/v1/aliases?page[number]=${pageNum}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
      },
    });

    if (res.status === 401) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error listing",
        message: "AnonAddy API credentials are invalid",
      });
      return [];
    }

    const data = (await res.json()) as listResponse;
    totalPages = Math.ceil(data.meta.total / 100);
    allAliases = allAliases.concat(data.data);
    pageNum++;
  }

  return allAliases;
};
