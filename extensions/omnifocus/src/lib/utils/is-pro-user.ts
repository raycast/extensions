import { showToast, Toast, Keyboard } from "@raycast/api";
import { executeScript } from "./executeScript";

export async function isProUser(): Promise<boolean> {
  try {
    await executeScript(`
             const omnifocus = Application('OmniFocus');
             return omnifocus.id()
        `);
    return true;
  } catch {
    return false;
  }
}

export async function showNotProUserErrorFeedback() {
  await showToast({
    title: "You need an Omnifocus subscription in order for this extension to work",
    style: Toast.Style.Failure,
    primaryAction: {
      onAction: () => open("https://www.omnigroup.com/omnifocus/features#Automation"),
      title: "Automation in OmniFocus Pro",
      shortcut: Keyboard.Shortcut.Common.Open,
    },
  });
}
