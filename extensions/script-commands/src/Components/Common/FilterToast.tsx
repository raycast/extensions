import { Toast, ToastStyle, showToast } from "@raycast/api";

import { Filter, State } from "@types";

export async function FilterToast(filter: Filter): Promise<Toast | null> {
  if (filter == null) {
    return null;
  }

  let title = "Filter activated: ";
  const message = `To clear the filter, press Command + Shift + C`;
  const style = ToastStyle.Success;

  if (typeof filter === "string") {
    title += filter;
  } else {
    if (filter === State.Installed) {
      title += "Installed";
    } else if (filter === State.NeedSetup) {
      title += "Need Setup";
    }
  }

  return showToast(style, title, message);
}
