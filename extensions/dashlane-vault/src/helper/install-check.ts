import { Toast, showToast } from "@raycast/api";

import { checkIfCliIsInstalled } from "@/lib/dcli";

export async function checkIfInstalled<T extends () => void>(cb: T) {
  const isAvailable = await checkIfCliIsInstalled();
  if (!isAvailable) {
    return showToast({
      title: "Dashlane CLI is not installed",
      style: Toast.Style.Failure,
    });
  }

  return cb();
}
