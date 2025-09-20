import { LocalStorage, showToast, Toast } from "@raycast/api";
import PocketBase from "pocketbase";
import { POCKETBASE_EMAIL, POCKETBASE_PASSWORD, POCKETBASE_URL } from "./config";
const pb = new PocketBase(POCKETBASE_URL);
export const pocketbase = pb;

export const authenticate = async () => {
  const toast = await showToast(Toast.Style.Animated, "Fetching Token");
  const token = await LocalStorage.getItem<string>("token");
  if (token) pocketbase.authStore.save(token);
  toast.title = "Verifying";
  if (!pocketbase.authStore.isValid) {
    toast.title = "Authenticating";
    const { token: newToken } = await pocketbase.admins.authWithPassword(POCKETBASE_EMAIL, POCKETBASE_PASSWORD);
    await LocalStorage.setItem("token", newToken);
  }
  toast.style = Toast.Style.Success;
  toast.title = "Authenticated";
};
