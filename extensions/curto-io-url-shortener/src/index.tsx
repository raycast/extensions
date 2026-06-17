import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch, { Headers } from "node-fetch";

interface CurtoResponse {
  data: {
    id: string;
    destination: string;
    token: string;
    short_link: string;
    domain_id: string;
    domain: string;
    password: boolean;
    created_at: string;
    updated_at: string;
    clicks: number;
  };
  status: string;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function reportError({ message }: { message: string }) {
  await showToast(Toast.Style.Failure, "Error", message.toString());
}

export default async function () {
  try {
    const { accessToken } = getPreferenceValues();
    const clipboard = await Clipboard.readText();
    if (!clipboard) {
      return await reportError(new Error("Clipboard is empty"));
    }

    new URL(clipboard);

    const response = await fetch("https://api.curto.io/v1/links", {
      headers: new Headers({
        "X-Curto-Api-Key": accessToken,
        "Content-Type": "application/json",
      }),
      method: "post",
      body: JSON.stringify({
        link: clipboard,
      }),
    });

    if (!response.ok) {
      throw new Error(`curto.io API Error - ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as CurtoResponse;

    if (!data || typeof data.status !== "string" || typeof data.data.short_link !== "string") {
      throw new Error("Invalid response from curto.io API");
    }

    const shortLink = data.data.short_link;
    await Clipboard.copy(shortLink);
    await showToast(Toast.Style.Success, "Success", "Copied shortened URL to clipboard");
  } catch (error: unknown) {
    await reportError({ message: getErrorMessage(error) });
  }
}
