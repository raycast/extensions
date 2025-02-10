import { getApiKey } from "./key";
import fetch from "node-fetch";
import { API_URL, getHeaders } from "../config";

export const createAlias = async (note?: string) => {
  const headers = getHeaders(getApiKey());
  const noteText = note ? note + " (Raycast)" : "Raycast";
  return await fetch(`${API_URL}/email/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      description: noteText,
    }),
  });
};
