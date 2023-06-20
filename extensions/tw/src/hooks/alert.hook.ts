import { Toast, showToast, Clipboard, confirmAlert, Icon, Alert } from "@raycast/api";
import { differenceInMilliseconds } from "date-fns";

/**
 * Run a command and show a toast on success or failure
 */
export const useAlerts = (cmd: string, startedAt = new Date()) => ({
  /**
   * on before (e.g. show alert)
   */
  onBefore: (confirm = false) =>
    new Promise<boolean>((resolve) => {
      const before = () => {
        startedAt = new Date();
        showToast({
          style: Toast.Style.Animated,
          title: cmd,
          primaryAction: {
            title: "Copy Command",
            onAction: async () => {
              await Clipboard.copy(cmd);
            },
          },
        });
        return resolve(true);
      };

      if (confirm) {
        return confirmAlert({
          icon: Icon.Warning,
          title: "Are you sure?",
          primaryAction: {
            title: "Confirm",
            style: Alert.ActionStyle.Destructive,
            onAction: before,
          },
        });
      }

      return before();
    }),

  /**
   * on success (e.g. show toast)
   */
  onSuccess: <T>(value: T) => {
    showToast({
      style: Toast.Style.Success,
      title: cmd,
      message: `${differenceInMilliseconds(new Date(), startedAt)}ms`,
      primaryAction: {
        title: "Copy Command",
        onAction: async () => {
          await Clipboard.copy(cmd);
        },
      },
      secondaryAction: {
        title: "Copy Output",
        onAction: async () => {
          await Clipboard.copy(String(value));
        },
      },
    });
    return value;
  },

  /**
   * on failure (e.g. show toast)
   */
  onFailure: (e: Error) => {
    showToast({
      style: Toast.Style.Failure,
      title: cmd,
      message: e?.message ?? e?.toString() ?? "Unknown error",
      primaryAction: {
        title: "Copy Command",
        onAction: async () => {
          await Clipboard.copy(cmd);
        },
      },
      secondaryAction: {
        title: "Copy Error",
        onAction: async () => {
          await Clipboard.copy(e.message ?? e.toString());
        },
      },
    });
  },
});
