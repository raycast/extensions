import { Cache } from "@raycast/api";
import { createGpgUnlockSession } from "../application/gpg-unlock-session";

const cache = new Cache({
  namespace: "gpg-unlock-session",
  capacity: 1024,
});

export const { markStoreUnlocked, forgetStoreUnlock, shouldTryAgentUnlock } =
  createGpgUnlockSession({
    storage: {
      get: (key) => cache.get(key),
      set: (key, value) => cache.set(key, value),
      remove: (key) => cache.remove(key),
    },
  });
