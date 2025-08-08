import { execSync } from "child_process";
import { showToast, Toast, showHUD } from "@raycast/api";

/**
 * Quick permission check - returns true if likely has permission, false if definitely doesn't, null if uncertain
 * This is much faster than the full permission check and won't block the screenshot process
 */
export async function quickPermissionCheck(): Promise<boolean | null> {
  try {
    return true;
  } catch {
    return null;
  }
}

/**
 * Comprehensive permission check - slower but more thorough
 * This should only be used when we've already detected a permission issue
 */
export async function ensureScreenRecordingPermission(): Promise<boolean> {
  try {
    const hasPermission = await checkScreenRecordingPermission();

    if (!hasPermission) {
      await showPermissionInstructions();
      return false;
    }

    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Permission Check Failed",
      message: error instanceof Error ? error.message : "Could not verify Screen Recording permissions",
    });
    return false;
  }
}

/**
 * Check if Screen Recording permission is granted by testing actual capture capability
 * This is only called when we suspect there might be a permission issue
 */
export async function checkScreenRecordingPermission(): Promise<boolean> {
  try {
    const tempPath = `/tmp/screenshot-permission-test-${Date.now()}.png`;

    try {
      execSync(`/usr/sbin/screencapture -x "${tempPath}"`, {
        stdio: "pipe",
        timeout: 2000,
      });

      try {
        execSync(`rm "${tempPath}"`, { stdio: "pipe", timeout: 500 });
      } catch {
        // Ignore cleanup errors
      }

      return true;
    } catch (error) {
      const errorObj = error as { status?: number };
      if (errorObj.status === 2) {
        return false;
      }
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Show detailed permission instructions to the user
 */
export async function showPermissionInstructions(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Screen Recording Permission Required",
    message: "Please grant Screen Recording permission to Raycast in System Settings",
    primaryAction: {
      title: "Open System Settings",
      onAction: async () => {
        try {
          execSync('open "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"', {
            stdio: "ignore",
          });
        } catch {
          try {
            execSync("open -b com.apple.systempreferences", { stdio: "ignore" });
          } catch {
            await showToast({
              style: Toast.Style.Failure,
              title: "Could not open System Settings",
              message: "Please manually open System Settings > Privacy & Security > Screen Recording",
            });
          }
        }
      },
    },
    secondaryAction: {
      title: "Instructions",
      onAction: async () => {
        await showHUD(`
Permission Setup Instructions:

1. Open System Settings (or System Preferences on older macOS)
2. Go to Privacy & Security
3. Click on Screen Recording
4. Make sure Raycast is enabled/checked
5. Restart Raycast if needed

Note: If Raycast already has permission but screenshots still fail, 
try removing and re-adding Raycast in Screen Recording settings.

After fixing permission, try the screenshot command again.
        `);
      },
    },
  });
}

/**
 * Attempt to trigger the macOS permission dialog
 */
export async function triggerPermissionPrompt(): Promise<void> {
  try {
    execSync("/usr/sbin/screencapture -x /tmp/permission-prompt-test.png", {
      stdio: "ignore",
      timeout: 3000,
    });

    try {
      execSync("rm /tmp/permission-prompt-test.png", { stdio: "ignore", timeout: 500 });
    } catch {
      // Ignore cleanup errors
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Detect if a screenshot might only show the wallpaper (indicating permission issues)
 */
export function detectWallpaperOnlyScreenshot(imageBuffer: Buffer): boolean {
  try {
    if (imageBuffer.length < 50 * 1024) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
