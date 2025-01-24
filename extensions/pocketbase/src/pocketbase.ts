import { showToast, Toast } from "@raycast/api";
import "cross-fetch/polyfill";
import PocketBase from "pocketbase";
import { POCKETBASE_EMAIL, POCKETBASE_PASSWORD, POCKETBASE_URL } from "./config";
const pb = new PocketBase(POCKETBASE_URL);
export const pocketbase = pb;

export const authenticate = async () => {
  if (!pocketbase.authStore.isValid) {
    const toast = await showToast(Toast.Style.Animated, "Authenticating");
    await pocketbase.admins.authWithPassword(POCKETBASE_EMAIL, POCKETBASE_PASSWORD);
    toast.style = Toast.Style.Success;
    toast.title = "Authenticated";
  }
};
