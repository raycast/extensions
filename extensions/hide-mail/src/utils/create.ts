import { getApiKey } from "./key";
import fetch from "node-fetch";
import { API_URL, getHeaders } from "../config";

export const createAlias = async () => {
  const headers = getHeaders(getApiKey());

  return await fetch(`${API_URL}/email/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      description: "Raycast",
    }),
  });
};
