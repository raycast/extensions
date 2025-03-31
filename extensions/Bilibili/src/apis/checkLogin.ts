import { Cache } from "@raycast/api";

export function checkLogin() {
  const cache = new Cache();
  const today = new Date().getTime();

  return cache.has("cookie") && new Date(cache.get("expires") || today).getTime() > today;
}
