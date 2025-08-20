import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryClient } from "../../api/hooks.js";
import { api } from "../../api/index.js";
import { MembershipContextProvider } from "../../utils/membership.js";
import { usePreferences } from "../../utils/preferences.js";

export type EntryProps = { children?: ReactNode };

export function Entry(props: EntryProps) {
  const prefs = usePreferences();

  let baseURL = prefs.serverUrl?.trim() || "https://api.solidtime.io";

  // Automatically append /api if it's not already present
  if (!baseURL.endsWith("/api")) {
    baseURL = baseURL.replace(/\/+$/, ""); // remove trailing slashes
    baseURL += "/api";
  }

  api.axios.defaults.baseURL = baseURL;

  if (prefs.apiKey && prefs.apiKey.trim().length > 0) {
    api.axios.defaults.headers.common["Authorization"] = `Bearer ${prefs.apiKey}`;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <MembershipContextProvider>{props.children}</MembershipContextProvider>
    </QueryClientProvider>
  );
}
