import { LocalStorage } from "@raycast/api";
import { FlickrAuth, PendingOAuth } from "./types";

const AUTH_STORAGE_KEY = "flickr-auth";
const PENDING_OAUTH_STORAGE_KEY = "pending-oauth";

// Use LocalStorage for auth tokens
// Note: Raycast's LocalStorage is stored on disk but not encrypted
// For maximum security, only use this extension on your personal computer

export async function getStoredAuth() {
  const value = await LocalStorage.getItem<string>(AUTH_STORAGE_KEY);
  return value ? (JSON.parse(value) as FlickrAuth) : undefined;
}

export async function setStoredAuth(auth: FlickrAuth) {
  await LocalStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export async function clearStoredAuth() {
  await LocalStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function getPendingOAuth() {
  const value = await LocalStorage.getItem<string>(PENDING_OAUTH_STORAGE_KEY);
  return value ? (JSON.parse(value) as PendingOAuth) : undefined;
}

export async function setPendingOAuth(pending: PendingOAuth) {
  await LocalStorage.setItem(PENDING_OAUTH_STORAGE_KEY, JSON.stringify(pending));
}

export async function clearPendingOAuth() {
  await LocalStorage.removeItem(PENDING_OAUTH_STORAGE_KEY);
}
