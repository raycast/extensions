import { closeMainWindow, open } from "@raycast/api";

export default async function Command() {
  const url = "shottr://ocr";
  await closeMainWindow();
  open(url);
}
