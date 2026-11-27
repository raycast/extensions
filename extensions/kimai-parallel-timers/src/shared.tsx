import {
  getPreferenceValues,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { Kimai } from "./api";
import { runOnce } from "./pending";
export function client() {
  const p = getPreferenceValues<Preferences>();
  return new Kimai(p.baseUrl, p.apiToken);
}
export async function perform(
  key: string,
  title: string,
  work: () => Promise<unknown>,
  refresh?: () => unknown,
) {
  return runOnce(key, async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await work();
      await refresh?.();
      toast.style = Toast.Style.Success;
      toast.title = "Done";
      try {
        await launchCommand({ name: "menu-bar", type: LaunchType.Background });
      } catch {
        /* Menu bar may be disabled. */
      }
    } catch (error) {
      // A multi-entry operation may have partially succeeded. Refresh before retry.
      try {
        await refresh?.();
      } catch {
        /* Preserve the original operation error. */
      }
      toast.style = Toast.Style.Failure;
      toast.title = title + " failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  });
}
