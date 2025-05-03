import { Keyboard, showHUD, showToast, open, Toast } from "@raycast/api";
import launchRuntime from "../utils/launchRuntime";

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
        onAction: () => {
          launchRuntime();
        },
      },
      secondaryAction: {
        title: "Contact Support",
        shortcut: Keyboard.Shortcut.Common.OpenWith,
        onAction: () => {
          open("https://docs.pieces.app/support");
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
          open("https://docs.pieces.app/support");
        },
      },
    });
  }

  public static getInstance() {
    return (this.instance ??= new Notifications());
  }
}
