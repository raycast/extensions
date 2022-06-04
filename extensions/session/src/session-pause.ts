import open from "open";
import { closeMainWindow, showHUD } from "@raycast/api";

export default async () => {
  const url = "session:///pause";
  open(url);
  await closeMainWindow();
  await showHUD("Session paused ⏲️");
};
