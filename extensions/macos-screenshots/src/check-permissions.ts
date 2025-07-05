import { showToast, Toast, showHUD } from "@raycast/api";
import {
  checkScreenRecordingPermission,
  showPermissionInstructions,
  triggerPermissionPrompt,
} from "./utils/permissions";

export default async function CheckPermissions() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Checking Permissions",
      message: "Verifying Screen Recording access...",
    });

    const hasPermission = await checkScreenRecordingPermission();

    if (hasPermission) {
      await showToast({
        style: Toast.Style.Success,
        title: "Permissions Granted",
        message: "Screen Recording permission is active. Screenshots should work properly.",
        primaryAction: {
          title: "Test Screenshot",
          onAction: async () => {
            await showHUD(`
Screen Recording Permission: GRANTED

Test your setup:
1. Use "Take Screenshot" command
2. Try different modes (Area, Window, Fullscreen)
3. Check if captured content includes applications

If screenshots still show only wallpaper:
- Restart Raycast completely
- Try logging out and back into your Mac
- Check for any pending macOS updates
            `);
          },
        },
      });
      return;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Permission Required",
      message: "Raycast needs Screen Recording permission to capture applications.",
      primaryAction: {
        title: "Fix Now",
        onAction: async () => {
          await showPermissionInstructions();
        },
      },
      secondaryAction: {
        title: "Trigger Prompt",
        onAction: async () => {
          await triggerPermissionPrompt();
        },
      },
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Permission Check Failed",
      message: "Unable to check Screen Recording permissions. Please check manually.",
      primaryAction: {
        title: "Manual Instructions",
        onAction: async () => {
          await showHUD(`
Manual Screen Recording Permission Check:

1. Open System Settings (macOS 13+) or System Preferences (older)
2. Navigate to:
   • macOS 13+: Privacy & Security > Screen Recording
   • macOS 12-: Security & Privacy > Privacy > Screen Recording
3. Look for "Raycast" in the applications list
4. Enable/check the box next to Raycast
5. Restart Raycast if prompted

Test:
- Use "Take Screenshot" command
- If it only captures wallpaper, permission is not properly granted
- If it captures windows/apps, permission is working

Troubleshooting:
- Not seeing Raycast in the list? Try taking a screenshot first
- Permission seems granted but not working? Restart Raycast completely
- Still issues? Log out and back into your macOS account
          `);
        },
      },
    });
  }
}
