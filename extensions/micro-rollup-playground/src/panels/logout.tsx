import { useNavigation } from "@raycast/api";
import { useEffect } from "react";
import { API_URL, removeFromStore } from "../utils/storage";

export const Logout = () => {
  const nav = useNavigation();
  useEffect(() => {
    async function removeApiUrl() {
      await removeFromStore(API_URL);
      nav.pop();
    }
    removeApiUrl();
  }, []);
  return null;
};
