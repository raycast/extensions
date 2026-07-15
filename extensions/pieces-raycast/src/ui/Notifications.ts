import { Keyboard, showHUD, showToast, Toast } from "@raycast/api";
import launchRuntime from "../utils/launchRuntime";
import BrowserUrl from "../utils/BrowserUrl";
import { PIECES_URLS } from "../utils/constants";

export default class Notifications {
  private static instance: Notifications;

  private constructor() {}

  async hudNotification(message: string) {
    return showHUD(message);
  }

  /**
   * Displays a server error toast notification with options to launch PiecesOS or contact support.
   *
   * @param {string} message - The specific action that failed, to be included in the toast message.
   * @returns {Promise<void>} A promise that resolves when the toast is shown.
   */
  async serverErrorToast(message: string) {
    await showToast({
      title: `Failed to ${message}. Please make sure that PiecesOS is installed, running, and up to date.`,
      primaryAction: {
        title: "Launch PiecesOS",
        shortcut: Keyboard.Shortcut.Common.Open,
        onAction: async () => {
          try {
            const launched = await launchRuntime();
            if (!launched) {
              await showToast({
                title: "Failed to launch PiecesOS",
                message: "Please try launching PiecesOS manually",
                style: Toast.Style.Failure,
              });
            }
          } catch (error) {
            await showToast({
              title: "Error launching PiecesOS",
              message:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
              style: Toast.Style.Failure,
            });
          }
        },
      },
      secondaryAction: {
        title: "Contact Support",
        shortcut: Keyboard.Shortcut.Common.OpenWith,
        onAction: () => {
          BrowserUrl.open(PIECES_URLS.SUPPORT);
        },
      },
      style: Toast.Style.Failure,
    });
  }

  async errorToast(message: string) {
    await showToast({
      title: message,
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Contact Support",
        shortcut: Keyboard.Shortcut.Common.Open,
        onAction: () => {
          BrowserUrl.open(PIECES_URLS.SUPPORT);
        },
      },
    });
  }

  public static getInstance() {
    return (this.instance ??= new Notifications());
  }
}
