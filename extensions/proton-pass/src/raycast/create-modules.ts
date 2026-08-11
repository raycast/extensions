import * as passCli from "../pass/pass-cli";
import { LocalStorage } from "@raycast/api";
import { createItemActivityStore } from "../activity/item-activity";
import { createAuthenticator } from "../authenticator/authenticator";
import { createItemCache } from "../items/item-cache";
import { createItems } from "../items/items";
import { createPasswords } from "../passwords/passwords";
import { createSession } from "../session/session";
import { createVaults } from "../vaults/vaults";
export function createExtensionModules() {
  return {
    items: createItems(passCli, createItemCache(LocalStorage)),
    activity: createItemActivityStore(LocalStorage),
    authenticator: createAuthenticator(passCli),
    passwords: createPasswords(passCli),
    session: createSession(passCli),
    vaults: createVaults(passCli),
  };
}
export const modules = createExtensionModules();
