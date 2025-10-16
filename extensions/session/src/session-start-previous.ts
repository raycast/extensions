import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  const url = "session:///start-previous";
  open(url);
  await closeMainWindow();
  await showHUD("Previous session started ⏲️");
};
