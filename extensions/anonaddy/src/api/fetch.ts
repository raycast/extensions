import { getPreferenceValues } from "@raycast/api";
import AddyError from "./error";

type Init = { body?: Record<string, unknown> | null | undefined } & Omit<RequestInit, "body">;

async function fetch<R = void>(path: string, init: Init = {}): Promise<R> {
  const { apiKey, endpoint } = getPreferenceValues<ExtensionPreferences>();
  const base = endpoint ?? "https://app.addy.io/";
  const baseUrl = new URL("api/v1/", base.endsWith("/") ? base : `${base}/`);
  const url = new URL(path, baseUrl);

  const response = await global.fetch(url.toString(), {
    ...init,
    body: JSON.stringify(init.body),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok) {
    throw new AddyError(response);
  }

  try {
    return (await response.json()) as R;
  } catch {
    return undefined as R;
  }
}

export default fetch;
