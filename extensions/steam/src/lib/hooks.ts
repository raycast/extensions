import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";

export const useIsLoggedIn = () => {
  const { token, steamid } = getPreferenceValues<Preferences>();
  const [loggedIn, setLoggedIn] = useState(Boolean(token && steamid));
  useEffect(() => {
    // If nothing is set, we don't have to check for an api key error
    if (token && steamid) {
      LocalStorage.getItem("API_KEY_ERROR").then((value) => {
        // Check if the current key/token matches the previously failed one
        // And if it does NOT, then give it a chance to auth again
        setLoggedIn(value !== token.trim() + steamid.trim());
      });
    }
  }, [token, steamid]);
  return loggedIn;
};

export const useShowingDetail = () => {
  const [showingDetail, setShowingDetail] = useCachedState("showing-detail", false);
  return { showingDetail, toggleDetail: () => setShowingDetail((current) => !current) };
};

const REJECTED_KEY = "rejected-key";
const rejectedKeyListeners = new Set<() => void>();

export async function markKeyRejected(key: string) {
  await LocalStorage.setItem(REJECTED_KEY, key);
  rejectedKeyListeners.forEach((listener) => listener());
}

export async function markKeyAccepted(key: string) {
  if ((await LocalStorage.getItem(REJECTED_KEY)) !== key) return;
  await LocalStorage.removeItem(REJECTED_KEY);
  rejectedKeyListeners.forEach((listener) => listener());
}

export const useKeyRejected = () => {
  const key = getPreferenceValues<Preferences>().token?.trim();
  const [rejected, setRejected] = useState(false);
  useEffect(() => {
    if (!key) return setRejected(false);
    const check = () => LocalStorage.getItem(REJECTED_KEY).then((value) => setRejected(value === key));
    check();
    rejectedKeyListeners.add(check);
    return () => {
      rejectedKeyListeners.delete(check);
    };
  }, [key]);
  return rejected;
};
