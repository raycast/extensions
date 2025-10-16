import { confirmAlert, environment, LocalStorage, showToast, Toast } from "@raycast/api";
import { createContext } from "react";

export const API_URL = environment.isDevelopment ? "http://localhost:1337" : "https://supertasks-api.fly.dev";

export const APP_URL = environment.isDevelopment ? "http://localhost:3000" : "https://app.taskplane.app";

export const AuthContext = createContext<{ setToken: (token?: string) => void; token?: string }>({
  setToken: () => undefined,
  token: undefined,
});

export const COLORS = {
  GREEN: "#22C55E",
  RED: "#EF4444",
};

export async function logout() {
  if (await confirmAlert({ title: "Are you sure you want to logout?" })) {
    await LocalStorage.removeItem("x-taskplane-token");
    showToast(Toast.Style.Success, "Logged out successfully");
  }
}

export async function getToken() {
  return LocalStorage.getItem<string>("x-taskplane-token");
}
