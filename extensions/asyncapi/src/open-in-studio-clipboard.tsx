import { Toast, showToast, Clipboard } from "@raycast/api";
import { openStudio } from "./utils";

export default async () => {
  const text = await Clipboard.readText();
  text && text.length > 0 ? await openStudio(text) : await showToast(Toast.Style.Failure, "Your clipboard is empty");
};
