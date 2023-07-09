import fetch from "node-fetch";

import { SELECT_FILES, UNRESTRICT_LINK, UNRESTRICT_MAGNET } from ".";
import { ErrorResponse, LinkType } from "../schema";

export const requestUnrestrict = async (link: string, token: string, type: LinkType = "link") => {
  const endpoint = type === "link" ? UNRESTRICT_LINK : UNRESTRICT_MAGNET;
  const params = new URLSearchParams();
  params.append(type, link);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      authorization: `Bearer ${token}`,
    },
    body: params,
  });

  if (!response.ok) {
    const { message, error } = (await response.json()) as ErrorResponse;
    throw new Error(`Something went wrong ${error || message || ""}`);
  }

  return response.json();
};
export const requestSelectFiles = async (id: string, token: string, selectedFiles?: string) => {
  const params = new URLSearchParams();
  params.append("files", selectedFiles || "all");

  const response = await fetch(SELECT_FILES(id), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      authorization: `Bearer ${token}`,
    },
    body: params,
  });

  if (!response.ok) {
    const { message, error } = (await response.json()) as ErrorResponse;
    throw new Error(`Something went wrong ${error || message || ""}`);
  }

  return response;
};
