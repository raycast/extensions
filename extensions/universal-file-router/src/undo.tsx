import { closeMainWindow } from "@raycast/api";
import { performUndo } from "./undo-utils";

export default async function Command() {
  await closeMainWindow();
  await performUndo();
}
