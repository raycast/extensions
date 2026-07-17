import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  await showToast({
    title: "Opening Mails...",
    style: Toast.Style.Animated,
  });

  await rescue(() => Herd.Mails.open(), "Failed to open Mails.");

  await closeMainWindow();
}
