import { LocalStorage } from "@raycast/api";

import type { RegistrationStorage } from "./OAuthClientRegistrationStore";

export class RaycastRegistrationStorage implements RegistrationStorage {
  getItem(key: string): Promise<string | undefined> {
    return LocalStorage.getItem<string>(key);
  }

  setItem(key: string, value: string): Promise<void> {
    return LocalStorage.setItem(key, value);
  }
}
