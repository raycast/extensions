import { Cache, LaunchType, Toast, getPreferenceValues, launchCommand, showToast } from "@raycast/api";
import { Bookmark, LoginPayload } from "./interfaces";
import { ACTIVE_ORGANIZATION, BOOKMARKS, CLICKS, LINKINIZE_DOMAIN, TOKEN } from "./constants";
import axios, { AxiosError, AxiosResponse } from "axios";

export const cache = new Cache();

export function hasToken() {
  const token = cache.get(TOKEN);
  return typeof token !== "undefined";
}

export async function attemptLogin(values: LoginPayload) {
  return axios
    .post(`${LINKINIZE_DOMAIN}/api/auth/login`, values)
    .then(async function (response: AxiosResponse) {
      cache.set(TOKEN, response.data.access_token);
      await showToast({ title: "Linkinize is Ready", message: "Enjoy lightening fast Bookmarks 🚀" });
      await launchCommand({ name: "synchronize", type: LaunchType.UserInitiated });
      return true;
    })
    .catch(async function (error) {
      return false;
    });
}

export async function logout() {
  await showToast({
    title: "Authentication Failed",
    message: "Please Check your Credentials in Extension Preferences.",
    style: Toast.Style.Failure,
  });
  cache.clear();
}

export async function handleAPIErrors(error: AxiosError) {
  switch (error.status) {
    case 401:
      logout();
      break;
    case 500:
      await showToast({ title: "Error", message: "Something went wrong, Please try again in a bit." });
      break;
    case 404:
      await showToast({ title: "Error", message: "Not found, please try again.", style: Toast.Style.Failure });
      break;
  }
}

export function recordInteraction(url: string) {
  const bookmarks = cache.get(BOOKMARKS);
  const cachedBookmarks = bookmarks ? JSON.parse(bookmarks) : [];
  const bookmark = cachedBookmarks.find((obj: Bookmark) => obj.url === url);
  if (!bookmark) {
    return;
  }
  const cached = cache.get(CLICKS);
  const clicks = cached ? JSON.parse(cached) : [];
  clicks.push({
    id: bookmark.id,
    at: Math.round(Date.now() / 1000),
    oid: cache.get(ACTIVE_ORGANIZATION),
  });
  cache.set(CLICKS, JSON.stringify(clicks));
}

export function getInteractions() {
  const cached = cache.get(CLICKS);
  return cached ? cached : JSON.stringify([]);
}

export async function authenticationCheck() {
  const isLoggedIn = hasToken();
  if (!isLoggedIn && !(await attemptLogin(getPreferenceValues<LoginPayload>()))) {
    logout();
    return;
  }
}
