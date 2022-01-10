import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "cleanshot://capture-text";
  open(url);
  await closeMainWindow();
};
