import fetch from "node-fetch";
import { Clipboard, showToast, Toast } from "@raycast/api";

import { API_URL, LINK_REGEX } from "../constants";
import { Adapter, ApiError, SearchResult } from "../@types/global";

const ALL_ADAPTERS = Object.values(Adapter).map((adapter) => adapter.toLowerCase());

export const isLinkValid = (link: string) => {
  return (
    link && LINK_REGEX.test(link) && ALL_ADAPTERS.some((adapter) => link.toLowerCase().includes(adapter.toLowerCase()))
  );
};

export const apiCall = async (link: string, adapter?: Adapter) => {
  const request = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ link, ...(adapter ? { adapters: [adapter] } : undefined) }),
  });

  const response = (await request.json()) as SearchResult & ApiError;

  if (request.status !== 200) {
    throw new Error(
      response.code === "VALIDATION" ? "Invalid link or not supported" : "Internal error, please try again",
    );
  }

  return response;
};

export const searchToClipboard = async (adapter: Adapter) => {
  const clipboardText = await Clipboard.readText();

  try {
    if (!clipboardText) {
      throw new Error("No text found in the Clipboard");
    }

    const response = await apiCall(clipboardText, adapter);

    const link = response.links.find(({ type }) => (type as Adapter) === adapter)?.url;
    if (!link) {
      throw new Error("Link not available on this Platform");
    }

    await Clipboard.copy(link);

    showToast(Toast.Style.Success, "Link converted and added to the Clipboard");
  } catch (error) {
    showToast(Toast.Style.Failure, "Error", (error as Error).message);
  }
};
