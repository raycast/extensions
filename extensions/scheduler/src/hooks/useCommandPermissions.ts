import { showToast, Toast } from "@raycast/api";
import { RaycastCommand, CommandPermissionStatus } from "../types";
import { getCommandDisplayName } from "../utils";
import { useLocalStorage } from "./useLocalStorage";
import { executeRaycastCommand } from "../utils/commandExecution";

const PERMISSIONS_STORAGE_KEY = "command_permissions";

const TOAST_MESSAGES = {
  TESTING: {
    title: "Testing Command",
    message: "Launching command to verify permissions...",
  },
  SUCCESS: {
    title: "Command Test Successful",
    message: "Command launched successfully and can be scheduled",
  },
  FAILURE: {
    title: "Command Test Failed",
  },
} as const;

export function useCommandPermissions() {
  const [permissions, setPermissions] = useLocalStorage<Record<string, CommandPermissionStatus>>(
    PERMISSIONS_STORAGE_KEY,
    {},
  );

  const createPermissionStatus = (command: RaycastCommand, hasPermission: boolean): CommandPermissionStatus => ({
    commandKey: command.deeplink,
    hasPermission,
    lastTestedAt: new Date().toISOString(),
    displayName: getCommandDisplayName(command),
  });

  const updatePermissionStatus = async (command: RaycastCommand, hasPermission: boolean) => {
    const status = createPermissionStatus(command, hasPermission);
    await setPermissions((prev) => ({ ...prev, [status.commandKey]: status }));
  };

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message;
    }
    return "Unknown error occurred";
  };

  const logCommandAction = (key: string, action: string) => {
    console.log(`${action} command permission for: ${key}`);
  };

  function getCommandPermission(command: RaycastCommand): CommandPermissionStatus | null {
    const key = command.deeplink;
    return permissions[key] || null;
  }

  async function testCommandPermission(command: RaycastCommand): Promise<boolean> {
    const key = command.deeplink;

    try {
      // Optimistically mark as successful before testing
      await updatePermissionStatus(command, true);

      await showToast({
        style: Toast.Style.Animated,
        title: TOAST_MESSAGES.TESTING.title,
        message: TOAST_MESSAGES.TESTING.message,
      });

      logCommandAction(key, "Testing");

      await executeRaycastCommand(command);

      logCommandAction(key, "Successfully launched");

      await showToast({
        style: Toast.Style.Success,
        title: TOAST_MESSAGES.SUCCESS.title,
        message: TOAST_MESSAGES.SUCCESS.message,
      });

      return true;
    } catch (error) {
      console.error("Error testing command permission:", error);

      // Mark as failed on error
      await updatePermissionStatus(command, false);

      await showToast({
        style: Toast.Style.Failure,
        title: TOAST_MESSAGES.FAILURE.title,
        message: getErrorMessage(error),
      });

      return false;
    }
  }

  return {
    getCommandPermission,
    testCommandPermission,
  };
}
