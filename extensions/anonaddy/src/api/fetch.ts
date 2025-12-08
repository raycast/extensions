import AddyError from "./error";
import preferences from "../preferences";

type Init = { body?: Record<string, unknown> | null | undefined } & Omit<RequestInit, "body">;

async function fetch<R = void>(path: string, init: Init = {}): Promise<R> {
  const url = new URL(path, "https://app.addy.io/api/v1/");

  const response = await global.fetch(url.toString(), {
    ...init,
    body: JSON.stringify(init.body),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${preferences.apiKey}`,
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
