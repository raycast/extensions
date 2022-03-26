import { LocalStorage, showToast, Toast } from "@raycast/api";
import { Bitwarden } from "./api";
import { SESSION_KEY } from "./const";

export default async function LockVault() {
  const sessionToken = await LocalStorage.getItem<string>(SESSION_KEY);
  const bw = new Bitwarden();

  await showToast(Toast.Style.Animated, "Locking Vault...");
  const status = await bw.status(sessionToken);

  switch (status) {
    case "locked": {
      showToast(Toast.Style.Failure, "Vault is already locked!");
      break;
    }
    case "unauthenticated": {
      showToast(Toast.Style.Failure, "You are logged out!");
      break;
    }
    case "unlocked": {
      await bw.lock();
      await LocalStorage.removeItem(SESSION_KEY);
      showToast(Toast.Style.Success, "Vault Locked!");
      break;
    }
  }
}
