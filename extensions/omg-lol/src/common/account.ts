import { LocalStorage } from "@raycast/api";

import { getPrefs } from "./prefs";
import { Account } from "./types";

const USERNAME = "username";

export async function setAccountFromResponse(accounts: Account[]) {
  const earliest = accounts.sort(
    (a, b) => a.registration.unix_epoch_time - b.registration.unix_epoch_time,
  )[0];
  await LocalStorage.setItem(USERNAME, earliest.address);
}

export async function getAccount(): Promise<string> {
  const usernameOverride = getPrefs().username;
  if (usernameOverride) {
    return usernameOverride;
  }

  const username = (await LocalStorage.getItem(USERNAME)) as string;
  return username;
}
