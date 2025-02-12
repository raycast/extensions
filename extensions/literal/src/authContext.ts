import { confirmAlert, LocalStorage, showToast, Toast, popToRoot } from "@raycast/api";
import { createContext } from "react";

export const AuthContext = createContext<{ setToken: (token?: string) => void; token?: string }>({
  setToken: () => undefined,
  token: undefined,
});

export async function logout() {
  if (await confirmAlert({ title: "Are you sure you want to logout?" })) {
    await LocalStorage.removeItem("x-literal-token");
    showToast(Toast.Style.Success, "Logged out successfully");
    popToRoot();
  }
}

export async function getToken() {
  return LocalStorage.getItem<string>("x-literal-token");
}
