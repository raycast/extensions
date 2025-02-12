import { LocalStorage } from "@raycast/api";
import crypto from "crypto";
import { cookieJar } from "./api";
import { getPreferences } from "./preference";
import { Item } from "./types";

export const getItemUserWorkaround = (item: Partial<Item>) => {
  const user = Array.isArray(item.user) ? item.user[0] : item.user;

  return user;
};

export const sha256Hex = (str: string) => {
  return crypto.createHash("sha256").update(str).digest("hex");
};

const HASH_STORE_KEY = "hashedSecret";
// clear exiting cookie when username/password is changed
export async function checkLoginCredentials() {
  const existingHashedSecret = await LocalStorage.getItem<string>(HASH_STORE_KEY);

  const { email, password } = getPreferences();
  const hashedSecret = sha256Hex(`${email}:${password}`);

  if (existingHashedSecret && existingHashedSecret === hashedSecret) {
    return;
  }

  cookieJar.removeAllCookiesSync();
  await LocalStorage.setItem(HASH_STORE_KEY, hashedSecret);
}
