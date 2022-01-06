import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "cleanshot://capture-window";
  open(url);
  await closeMainWindow();
};
