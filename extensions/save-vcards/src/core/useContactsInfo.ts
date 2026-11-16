// Accounts and duplicate matches from Apple Contacts, loaded in the background.
import { LocalStorage } from "@raycast/api";
import { useRef, useState } from "react";
import { contactsInfo, type Account, type ExistingContact } from "../native";
import {
  CACHE_ACCOUNTS,
  LAST_ACCOUNT,
  readCache,
  showContactsAccessToast,
} from "./contact";
import { log, logPrivate } from "./log";

export function useContactsInfo(initialAccountId = "") {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [existing, setExisting] = useState<ExistingContact[]>([]);
  const [accountId, setAccountId] = useState(initialAccountId);
  const [checking, setChecking] = useState(false);
  // Each check gets a number; a slower, older check can never overwrite a newer one.
  const request = useRef(0);
  const warnedAccess = useRef(false);

  // Picks the account to save to: the current choice, else the last one used, else the default.
  async function resolveAccount(list: Account[]) {
    const last = await LocalStorage.getItem<string>(LAST_ACCOUNT);
    setAccountId(
      (current) =>
        (list.some((a) => a.id === current) && current) ||
        list.find((a) => a.id === last)?.id ||
        list.find((a) => a.isDefault)?.id ||
        list[0]?.id ||
        "",
    );
  }

  async function loadCached() {
    const cached = await readCache<Account[]>(CACHE_ACCOUNTS);
    if (cached?.length) {
      setAccounts(cached);
      await resolveAccount(cached);
    }
  }

  async function check(emails: string[], phones: string[]) {
    const id = ++request.current;
    setChecking(true);
    setExisting([]);
    try {
      const info = await contactsInfo(emails, phones);
      if (id !== request.current) return;
      if (info.contactsAccess !== "authorized") {
        if (!warnedAccess.current) await showContactsAccessToast();
        warnedAccess.current = true;
        return;
      }
      setAccounts(info.accounts);
      setExisting(info.existing);
      logPrivate("contacts", "accounts and matches", info);
      await LocalStorage.setItem(CACHE_ACCOUNTS, JSON.stringify(info.accounts));
      await resolveAccount(info.accounts);
    } catch (err) {
      log("contacts", "check failed", err);
    } finally {
      if (id === request.current) setChecking(false);
    }
  }

  return {
    accounts,
    existing,
    accountId,
    setAccountId,
    checking,
    check,
    loadCached,
  };
}
