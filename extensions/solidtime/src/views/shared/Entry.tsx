import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { queryClient } from "../../api/hooks.js";
import { api } from "../../api/index.js";
import { MembershipContextProvider } from "../../utils/membership.js";
import { usePreferences } from "../../utils/preferences.js";

export type EntryProps = { children?: ReactNode };

export function Entry(props: EntryProps) {
  // Set API key for api client
  const prefs = usePreferences();
  api.axios.defaults.headers.common["Authorization"] = `Bearer ${prefs.apiKey}`;

  return (
    <QueryClientProvider client={queryClient}>
      <MembershipContextProvider>{props.children}</MembershipContextProvider>
    </QueryClientProvider>
  );
}
