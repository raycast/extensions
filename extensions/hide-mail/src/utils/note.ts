import { getApiKey } from "./key";
import { getApiUrl, getHeaders } from "../config";
import { InvalidApiKeyError } from "./invalid-key";

export const NOTE_MAX_LENGTH = 255;

export const updateAliasNote = async (email: string, note: string) => {
  const res = await fetch(`${getApiUrl()}/aliases`, {
    method: "PATCH",
    headers: getHeaders(getApiKey()),
    body: JSON.stringify({ email, note }),
  });

  if (res.status === 401) {
    throw new InvalidApiKeyError();
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? `HideMail API responded with ${res.status}`);
  }
};
