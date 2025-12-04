import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { baseHeaders } from "../lib/constants";
import { AccountsItem } from "../lib/types/users-types.types";

export default function useAuth() {
  const [authHeaders, setAuthHeaders] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<AccountsItem[] | null>(null);

  async function checkAuthStatus() {
    const accountsString = (await LocalStorage.getItem<string>("accounts")) ?? null;

    if (accountsString) {
      setAccounts(JSON.parse(accountsString) as AccountsItem[]);
    }
  }

  async function getAuthHeaders() {
    const sessionSecret = await LocalStorage.getItem<string>("sessionSecret");
    const headers = {
      ...baseHeaders,
      "expo-session": sessionSecret || "",
      cookie: `io.expo.auth.sessionSecret=${encodeURIComponent(sessionSecret || "")};`,
    };
    setAuthHeaders(headers);
    return headers;
  }

  useEffect(() => {
    checkAuthStatus();
    getAuthHeaders();
  }, []);

  return { authHeaders, accounts, getAuthHeaders };
}
