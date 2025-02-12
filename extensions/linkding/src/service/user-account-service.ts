import { LocalStorage } from "@raycast/api";
import { LinkdingAccountMap } from "../types/linkding-types";

const LINKDING_ACCOUNTS = "linkding_accounts";

export function getPersistedLinkdingAccounts() {
  return LocalStorage.getItem<string>(LINKDING_ACCOUNTS).then((unparsedAccounts) => {
    if (unparsedAccounts) {
      return JSON.parse(unparsedAccounts) as LinkdingAccountMap;
    } else {
      return {};
    }
  });
}

export function setPersistedLinkdingAccounts(linkdingAccountsMap: LinkdingAccountMap) {
  LocalStorage.setItem(LINKDING_ACCOUNTS, JSON.stringify(linkdingAccountsMap));
}
