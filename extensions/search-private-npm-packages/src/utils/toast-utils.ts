import { showToast } from "@raycast/api";

export async function hideToast() {
  showToast({ title: "" }).then((t) => t.hide());
}
