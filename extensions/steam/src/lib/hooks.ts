import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export const useIsLoggedIn = () => {
  const { token, steamid } = getPreferenceValues();
  const [loggedIn, setLoggedIn] = useState(token?.length > 0 && steamid?.length > 0);
  useEffect(() => {
    // If nothing is set, we don't have to check for an api key error
    if (token?.length > 0 && steamid?.length > 0) {
      LocalStorage.getItem("API_KEY_ERROR").then((value) => {
        // Check if the current key/token matches the previously failed one
        // And if it does NOT, then give it a chance to auth again
        setLoggedIn(value !== token.trim() + steamid.trim());
      });
    }
  });
  return loggedIn;
};
