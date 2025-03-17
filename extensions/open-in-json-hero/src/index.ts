import { showHUD, Clipboard, open, showToast, Toast, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import invariant from "tiny-invariant";

interface Preferences {
  ttl: string;
  domain: string;
}

export default async function main() {
  const text = await Clipboard.readText();

  if (!text) {
    showHUD("No text found in clipboard");
    return;
  }

  try {
    const json = JSON.parse(text);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Uploading JSON",
    });

    const document = await createNewDocument("Untitled", json);

    await toast.hide();

    await open(document.location);
  } catch (error) {
    if (error instanceof Error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: "Unknown error",
      });
    }
  }
}

const getTTL = () => {
  const preferences = getPreferenceValues<Preferences>();
  const ttl = parseInt(preferences.ttl);
  return ttl > 0 ? ttl : null;
};

const getEndpoint = () => {
  const preferences = getPreferenceValues<Preferences>();
  const domain = String(preferences.domain);
  invariant(domain, "domain is undefined");

  const endpoint = new URL(domain);
  endpoint.pathname = "/api/create.json";
  endpoint.searchParams.append("utm_source", "raycast");

  return endpoint.toString();
};

async function createNewDocument(title: string, json: unknown): Promise<{ id: string; location: string }> {
  const options = {
    method: "POST",
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      content: json,
      ttl: getTTL(),
    }),
  };

  const endpoint = getEndpoint();

  const response = await fetch(endpoint, options);
  const jsonResponse = await response.json();

  invariant(jsonResponse, "jsonResponse is undefined");
  invariant(typeof jsonResponse === "object", "jsonResponse is not an object");

  return jsonResponse as { id: string; location: string };
}
