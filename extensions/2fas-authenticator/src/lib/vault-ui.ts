import { showToast, Toast } from "@raycast/api";
import { isVaultCached } from "./vault";
import { KeychainAuthCancelled } from "./keychain";

export async function withVaultUnlock<T>(cb: () => T): Promise<T> {
  const needsUnlock = !isVaultCached();
  let toast: Toast | null = null;
  if (needsUnlock) {
    toast = await showToast({
      style: Toast.Style.Animated,
      title: "Unlocking vault…",
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  try {
    return cb();
  } finally {
    toast?.hide();
  }
}

export async function reportVaultLoadError(error: unknown): Promise<void> {
  if (error instanceof KeychainAuthCancelled) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Authentication cancelled",
    });
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to load vault",
    });
  }
}
