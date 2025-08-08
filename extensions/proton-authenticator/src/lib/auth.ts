import { execSync } from "child_process";
import { canAuthenticate, authenticate } from "macos-touchid";

export function hasTouchID(): boolean {
  return canAuthenticate();
}

export async function authenticateWithTouchID(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!canAuthenticate()) {
      console.error("Touch ID not available on this device");
      resolve(false);
      return;
    }

    authenticate("access TOTP codes", (err: Error | null, didAuthenticate: boolean) => {
      try {
        // workaround to refocus Raycast after system auth dialog
        execSync('open -a "Raycast"');
      } catch (error) {
        console.error("Could not reopen Raycast:", error);
      }

      if (err) {
        console.error("Touch ID authentication error:", err);
        resolve(false);
        return;
      }

      if (!didAuthenticate) {
        resolve(false);
        return;
      }

      resolve(true);
    });
  });
}
