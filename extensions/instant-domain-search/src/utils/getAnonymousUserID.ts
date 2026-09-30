import { LocalStorage } from "@raycast/api";
import { ANONYMOUS_USER_ID_KEY } from "./config";
import { randomUUID } from "node:crypto";

export default async function getAnonymousUserID() {
  const anonymousUserID = await LocalStorage.getItem<string>(ANONYMOUS_USER_ID_KEY);

  if (anonymousUserID) {
    try {
      return JSON.parse(anonymousUserID);
    } catch {
      return await setAnonymousUserID();
    }
  }

  return await setAnonymousUserID();
}

async function setAnonymousUserID() {
  const newAnonymousUserID = randomUUID();
  await LocalStorage.setItem(ANONYMOUS_USER_ID_KEY, JSON.stringify(newAnonymousUserID));
  return newAnonymousUserID;
}
