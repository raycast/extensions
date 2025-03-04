import { getApiKey } from "./key";
import fetch from "node-fetch";
import { API_URL, getHeaders } from "../config";

export interface emailObject {
  id: string;
  email: string;
  is_active: boolean;
  note: string | null;
  total_blocked: number;
  total_forwarded: number;
}

interface listResponse {
  data: emailObject[];
  total: number;
}

export const listAllAliases = async () => {
  const headers = getHeaders(getApiKey());

  let pageNum = 1;
  let totalPages: number | undefined = undefined;
  let all: emailObject[] = [];

  while (totalPages === undefined || pageNum <= totalPages) {
    const res = await fetch(`${API_URL}/aliases?page[number]=${pageNum}`, {
      headers,
    });

    if (res.status === 401) {
      throw new Error("❌ HideMail API credentials are invalid.");
    }

    const data = (await res.json()) as listResponse;
    totalPages = Math.ceil(data.total / 100);
    all = all.concat(data.data);
    pageNum++;
  }

  return all;
};
