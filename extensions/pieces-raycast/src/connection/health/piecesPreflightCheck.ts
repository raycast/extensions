import piecesInstalledCheck from "./piecesInstalledCheck";
import piecesUpToDateCheck from "./piecesUpToDateCheck";
import { UserProfile } from "@pieces.app/pieces-os-client";
import Notifications from "../../ui/Notifications";
import {
  Keyboard,
  LaunchType,
  Toast,
  launchCommand,
  showToast,
} from "@raycast/api";
import UserStream from "../user/UserStream";

export enum PreflightErrorType {
  NOT_INSTALLED = "NOT_INSTALLED",
  NEEDS_UPDATE = "NEEDS_UPDATE",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

interface PreflightResult {
  healthy: boolean;
  authenticated: boolean;
  error?: PreflightErrorType;
}

class PiecesPreflightService {
  private static instance: PiecesPreflightService;
  public user: UserProfile | null = null;
  private constructor() {}

  public async performCheck(): Promise<PreflightResult> {
    try {
      const runningAndInstalled = await piecesInstalledCheck();
      if (!runningAndInstalled) {
        return {
          healthy: false,
          authenticated: false,
          error: PreflightErrorType.NOT_INSTALLED,
        };
      }

      const updated = await piecesUpToDateCheck();
      if (!updated) {
        return {
          healthy: false,
          authenticated: false,
          error: PreflightErrorType.NEEDS_UPDATE,
        };
      }
      const authenticated = !!this.user;

      return { healthy: true, authenticated };
    } catch (error) {
      return {
        healthy: false,
        authenticated: false,
        error: PreflightErrorType.UNKNOWN_ERROR,
      };
    }
  }

  /**
   * Quick check for authentication only (uses cached health if available)
   */
  isAuthenticated(): boolean {
    return !!this.user;
  }

  static getInstance(): PiecesPreflightService {
    UserStream.getInstance();
    if (!PiecesPreflightService.instance) {
      PiecesPreflightService.instance = new PiecesPreflightService();
    }
    return PiecesPreflightService.instance;
  }
}

/**
 * Convenience function for commands that need both health and auth
 */
export async function piecesPreflightCheck(): Promise<boolean> {
  const service = PiecesPreflightService.getInstance();
  const result = await service.performCheck();

  if (!result.healthy) {
    await showPreflightError(result, () => piecesPreflightCheck());
    return false;
  }

  if (!result.authenticated) {
    await showToast({
      title: "Authentication Required",
      message: "Please sign in to Pieces to use this feature.",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Sign in",
        shortcut: Keyboard.Shortcut.Common.Open,
        onAction: () => {
          launchCommand({
            name: "signin",
            type: LaunchType.UserInitiated,
          });
        },
      },
    });

    return false;
  }

  return true;
}

/**
 * Convenience function for commands that only need health (no auth required)
 */
export async function piecesHealthOnlyCheck(): Promise<boolean> {
  const service = PiecesPreflightService.getInstance();
  const result = await service.performCheck();

  if (!result.healthy) {
    await showPreflightError(result, () => piecesHealthOnlyCheck());
  }

  return result.healthy;
}

/**
 * Convenience function to check just authentication (assumes health is OK)
 */
export async function piecesAuthCheck(): Promise<boolean> {
  const service = PiecesPreflightService.getInstance();
  const authenticated = service.isAuthenticated();

  if (!authenticated) {
    await Notifications.getInstance().errorToast(
      "Please sign in to Pieces to use this feature.",
    );
    return false;
  }

  return true;
}

/**
 * Helper function to show appropriate error message based on preflight result
 */
async function showPreflightError(
  result: PreflightResult,
  retryAction?: () => void,
): Promise<void> {
  if (result.error === PreflightErrorType.NOT_INSTALLED) {
    await showToast({
      title: "PiecesOS Not Found",
      message:
        "PiecesOS needs to be installed and running to use this feature.",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Install PiecesOS",
        shortcut: Keyboard.Shortcut.Common.Open,
        onAction: () => {
          // This will trigger the installation flow
          piecesInstalledCheck();
        },
      },
    });
  } else if (result.error === PreflightErrorType.NEEDS_UPDATE) {
    await showToast({
      title: "PiecesOS Update Required",
      message: "PiecesOS needs to be updated to use this feature.",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Update PiecesOS",
        shortcut: Keyboard.Shortcut.Common.Open,
        onAction: () => {
          // This will trigger the update flow
          piecesUpToDateCheck();
        },
      },
    });
  } else {
    await showToast({
      title: "Connection Error",
      message: "Unable to connect to PiecesOS. Please check that it's running.",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Retry",
        shortcut: Keyboard.Shortcut.Common.Open,
        onAction:
          retryAction ||
          (() => {
            // Default retry action
            piecesPreflightCheck();
          }),
      },
    });
  }
}

export default PiecesPreflightService;
