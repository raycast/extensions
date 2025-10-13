import { Icon, Image } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

const { instance_url, api_key } = getPreferenceValues<Preferences>();

export const headers = {
  "Content-Type": "application/json",
  "x-api-key": api_key,
};

export const validUrl = (url: string) => {
  try {
    new URL(url);
  } catch {
    return false;
  }
  return true;
};

export const validInstanceUrl = () => validUrl(instance_url);

export const callApi = async (
  endpoint: string,
  { method, body }: { method: "DELETE" | "POST" | "PUT"; body?: Record<string, string | boolean | number> },
) => {
  const url = new URL(`api/v1/${endpoint}`, instance_url).toString();
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return;
  const result = await response.json();
  if (!response.ok) {
    const err = result as { message: string } | string;
    throw new Error(typeof err === "object" ? err.message : err);
  }
  return result;
};

export const watchIcon = (url: string): Image.ImageLike => getFavicon(url, { fallback: Icon.Globe });
export const getUrl = (suffix: string): string => new URL(suffix, instance_url).toString();
