import { Clipboard, showToast, Toast } from "@raycast/api";

import { getApiUrl, LINK_REGEX } from "../constants";
import { Adapter, ApiError, SearchResult } from "../@types/global";

export const isLinkValid = (link: string) => {
  return link && LINK_REGEX.test(link);
};

export const isAbortError = (error: unknown) => {
  return error instanceof Error && error.name === "AbortError";
};

const messageForStatus = (status: number) => {
  if (status === 429) {
    return "Rate limit exceeded. Please wait a moment and try again.";
  }

  if (status === 400) {
    return "Invalid link or not supported";
  }

  if ([502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527].includes(status)) {
    return "Conversion service is temporarily unavailable. Please try again later.";
  }

  if (status >= 500) {
    return "Conversion service error. Please try again later.";
  }

  return "Conversion service is temporarily unavailable. Please try again later.";
};

export const apiCall = async (link: string, adapter?: Adapter, signal?: AbortSignal) => {
  let request: Awaited<ReturnType<typeof fetch>>;

  try {
    request = await fetch(getApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ link, ...(adapter ? { adapters: [adapter] } : undefined) }),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error("Could not reach the conversion service. Please try again later.");
  }

  const { status } = request;
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!isJson) {
    throw new Error(messageForStatus(status));
  }

  let response: SearchResult & ApiError;

  try {
    response = (await request.json()) as SearchResult & ApiError;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(messageForStatus(status));
  }

  if (status !== 200) {
    if (status === 429) {
      throw new Error(messageForStatus(status));
    }

    if (status === 400 || response.code === "VALIDATION") {
      throw new Error("Invalid link or not supported");
    }

    throw new Error(messageForStatus(status));
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

    const link = response.links.find(({ type }) => type === adapter)?.url;
    if (!link) {
      throw new Error("Link not available on this Platform");
    }

    await Clipboard.copy(link);

    showToast(Toast.Style.Success, "Link converted and added to the Clipboard");
  } catch (error) {
    showToast(Toast.Style.Failure, "Error", (error as Error).message);
  }
};
