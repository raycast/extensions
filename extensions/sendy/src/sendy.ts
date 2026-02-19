import { getPreferenceValues } from "@raycast/api";
import { Item } from "./types";

const { sendy_url, api_key } = getPreferenceValues<Preferences>();
export const buildSendyUrl = (path: string) => new URL(path, sendy_url.endsWith("/") ? sendy_url : `${sendy_url}/`);
const request = async <T>(endpoint: string, payload?: Record<string, string>) => {
  const url = buildSendyUrl(`api/${endpoint}`);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ api_key, ...payload }),
  });

  if (!response.ok) throw new Error(response.statusText);
  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch {
    result = text;
  }
  return result as T;
};

export const getBrands = () => request<{ [key: string]: Item }>("brands/get-brands.php");
export const getLists = (brandId: string) =>
  request<{ [key: string]: Item }>("lists/get-lists.php", { brand_id: brandId, include_hidden: "no" });
export const getActiveSubscriberCount = (listId: string) =>
  request<number>("subscribers/active-subscriber-count.php", { list_id: listId });
export const checkSubscriberStatus = (listId: string, email: string) =>
  request<string>("subscribers/subscription-status.php", { list_id: listId, email });
