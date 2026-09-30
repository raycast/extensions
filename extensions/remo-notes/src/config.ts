import { environment } from "@raycast/api";

const PROD_CONVEX_URL = "https://adventurous-herring-510.convex.cloud";
const PROD_WEB_APP_URL = "https://remo.now";

const DEV_CONVEX_URL = "https://graceful-coyote-371.convex.cloud";
const DEV_WEB_APP_URL = "http://localhost:3000";

const isDev = environment.isDevelopment;

const rawConvexUrl = isDev ? DEV_CONVEX_URL : PROD_CONVEX_URL;
const rawWebAppUrl = isDev ? DEV_WEB_APP_URL : PROD_WEB_APP_URL;

export const DEFAULT_CONVEX_URL = rawConvexUrl.replace(/\/$/, "");
export const DEFAULT_WEB_APP_URL = rawWebAppUrl.replace(/\/$/, "");

export function buildWebUrl(path = "") {
  if (!path) {
    return DEFAULT_WEB_APP_URL;
  }
  return `${DEFAULT_WEB_APP_URL}/${path.replace(/^\/+/, "")}`;
}

export function buildAppUrl(path = "") {
  if (!path) {
    return buildWebUrl("/app");
  }
  return buildWebUrl(`/app/${path.replace(/^\/+/, "")}`);
}
