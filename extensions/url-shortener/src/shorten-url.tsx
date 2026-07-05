import { getSelectedText, showToast, Toast } from "@raycast/api";
import { shorten } from "./utils";

export default async function Command() {
  const toast = await showToast(Toast.Style.Animated, "Shortening URL");
  try {
    const url = await getSelectedText();
    await shorten(url);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${error || "Can't get selected text"}`;
  }
}
