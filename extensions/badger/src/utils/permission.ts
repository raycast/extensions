import { WindowManagement } from "@raycast/api";

interface AppleScriptError {
  message: string;
}

async function showMenuBarError(error: unknown) {
  if (typeof error === "object") {
    const _error = error as AppleScriptError;

    if (_error.message.includes("-1743")) {
      throw new Error(
        [
          "For Badger to access the Dock, Raycast must have the System Events permission enabled in:",
          "Settings > Privacy & Security > Automation",
        ].join("\n\n"),
      );
    }

    if (_error.message.includes("-1719")) {
      // Try to prompt the user to enable accessibility permissions.
      await WindowManagement.getWindowsOnActiveDesktop();

      throw new Error(
        [
          "For Badger to access the Dock, Raycast must have the Accessibility permission enabled in:",
          "Settings > Privacy & Security > Accessibility",
        ].join("\n\n"),
      );
    }
  }
}

export default showMenuBarError;
