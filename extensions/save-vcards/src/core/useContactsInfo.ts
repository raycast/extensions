// Accounts and duplicate matches from Apple Contacts, loaded in the background and cached
// between launches. The account to save to is the user's choice, else the last one used,
// else the Contacts default.
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { contactsInfo, type Account } from "../native";
import { LAST_ACCOUNT, showContactsAccessToast } from "./contact";
import { logPrivate } from "./log";

export function useContactsInfo(emails: string[], phones: string[], initialAccountId?: string) {
  const { value: lastAccount } = useLocalStorage<string>(LAST_ACCOUNT);
  const [chosen, setChosen] = useState<string | undefined>(initialAccountId || undefined);
  const warned = useRef(false);

  const { data, isLoading } = useCachedPromise(contactsInfo, [emails, phones], {
    keepPreviousData: true,
    failureToastOptions: { title: "Could not read your Contacts" },
    onData: (info) => logPrivate("contacts", "accounts and matches", info),
  });

  const authorized = data?.contactsAccess === "authorized";
  useEffect(() => {
    if (data && !authorized && !warned.current) {
      warned.current = true;
      void showContactsAccessToast();
    }
  }, [data, authorized]);

  const accounts: Account[] = authorized ? data.accounts : [];
  const pick = (id?: string) => (id && accounts.some((a) => a.id === id) ? id : undefined);
  const accountId = pick(chosen) ?? pick(lastAccount) ?? accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? "";

  return {
    accounts,
    // Matches for the previous email/phone (or from the cache) must not be offered while checking.
    existing: authorized && !isLoading ? data.existing : [],
    accountId,
    setAccountId: setChosen,
    checking: isLoading,
  };
}
