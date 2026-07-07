/**
 * Confirmation + error helpers for the many destructive dashboard actions
 * (client block, config restore/rollback, backup/s3/entity delete, counter reset).
 * Wraps `confirmAlert` with the Destructive action style, and re-exports
 * `showFailureToast` so catch blocks stay one-liners.
 */
import { Alert, Icon, confirmAlert } from "@raycast/api";
import type { Image } from "@raycast/api";

export { showFailureToast } from "@raycast/utils";

export async function confirmDestructive(opts: {
  title: string;
  message?: string;
  actionTitle?: string;
  icon?: Image.ImageLike;
}): Promise<boolean> {
  return confirmAlert({
    title: opts.title,
    message: opts.message,
    icon: opts.icon ?? Icon.Trash,
    primaryAction: {
      title: opts.actionTitle ?? "Confirm",
      style: Alert.ActionStyle.Destructive,
    },
  });
}
