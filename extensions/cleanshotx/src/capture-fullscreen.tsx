import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "cleanshot://capture-fullscreen";
  open(url);
  await closeMainWindow();
};
