import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "cleanshot://open-from-clipboard";
  open(url);
  await closeMainWindow();
};
