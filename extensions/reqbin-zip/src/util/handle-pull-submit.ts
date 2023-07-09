import { Toast, showToast, Clipboard } from "@raycast/api";
import fetch from "node-fetch";

import { url } from "../constants/url";

type Response = Partial<{
  pasteContents: string;
  isEditable: boolean;
}>;

type Values = {
  pullUrl: string;
};

function isValidUrl(pullUrl: string) {
  try {
    new URL(pullUrl);
  } catch (e) {
    return false;
  }

  return pullUrl.startsWith(url);
}

function buildApiUrl(pullUrl: string) {
  const pasteObjectId = pullUrl.replace(url, "");
  return `${url}/api/${pasteObjectId}`;
}

async function handleValidUrl(pullUrl: string, toast: Toast) {
  const apiUrl = buildApiUrl(pullUrl);
  const response = await fetch(apiUrl);

  if (!response.ok) {
    toast.style = Toast.Style.Failure;
    toast.message = "Failed to find ReqBin";
    return;
  }

  const body = (await response.json()) as Response;

  if (!body.pasteContents) {
    toast.style = Toast.Style.Failure;
    toast.message = "Failed to find ReqBin";
    return;
  }

  Clipboard.copy(body.pasteContents);
  toast.style = Toast.Style.Success;
  toast.message = "The contents of the ReqBin are attached to your clipboard";
  toast.title = "Successfully pulled ReqBin";
}

export async function handlePullSubmit({ pullUrl }: Values) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Pulling ReqBin...",
  });

  if (isValidUrl(pullUrl)) {
    return await handleValidUrl(pullUrl, toast);
  }

  toast.style = Toast.Style.Failure;
  toast.message = "Failed to find ReqBin";
}
