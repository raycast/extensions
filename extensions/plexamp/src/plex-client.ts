import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

const CLIENT_IDENTIFIER_KEY = "plexamp-client-identifier";

export async function getClientIdentifier(): Promise<string> {
  const existing = await LocalStorage.getItem<string>(CLIENT_IDENTIFIER_KEY);
  if (existing) {
    return existing;
  }

  const created = randomUUID();
  await LocalStorage.setItem(CLIENT_IDENTIFIER_KEY, created);
  return created;
}
