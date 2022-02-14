import { getLocalStorageItem, removeLocalStorageItem, showToast, ToastStyle } from "@raycast/api";
import { Bitwarden } from "./api";
import { SESSION_KEY } from "./const";

export default async function LockVault() {
  const sessionToken = await getLocalStorageItem<string>(SESSION_KEY);
  const bw = new Bitwarden();

  await showToast(ToastStyle.Animated, "Locking Vault...");
  const status = await bw.status(sessionToken);

  switch (status) {
    case "locked": {
      showToast(ToastStyle.Failure, "Vault is already locked!");
      break;
    }
    case "unauthenticated": {
      showToast(ToastStyle.Failure, "You are logged out!");
      break;
    }
    case "unlocked": {
      await bw.lock();
      await removeLocalStorageItem(SESSION_KEY);
      showToast(ToastStyle.Success, "Vault Locked!");
      break;
    }
  }
}
