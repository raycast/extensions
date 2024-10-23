import { showFailureToast } from "@raycast/utils";
import { CorcelRequestProps } from "./types";
import { getPreferenceValues } from "@raycast/api";
import { ChatStream } from "../stream";
import fetch from "node-fetch";

export async function handleError(response: Response) {
  if (response.status === 403) {
    showFailureToast("NSFW Content Detected, Please Try Again");
  } else {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      await response.json();
      showFailureToast("Oops there was an error - please try again.");
    } else {
      await response.text();
      showFailureToast("Oops there was an error - please try again.");
    }
  }
}

export const corcelStreamRequest = async ({ data, url }: CorcelRequestProps) => {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`https://api.corcel.io${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      Authorization: `Bearer: ${preferences.apiKey}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.body || !response.ok) {
    const errorText = await response.text();
    const error = JSON.parse(errorText);
    new Error(error.message);
    throw new Error(error.message);
  }

  const stream = await ChatStream(response.body);

  return stream;
};
