import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "cleanshot://toggle-desktop-icons";
  open(url);
  await closeMainWindow();
};
