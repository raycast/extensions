import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  const url = "session:///start";
  open(url);
  await closeMainWindow();
  await showHUD("New session started ⏲️");
};
