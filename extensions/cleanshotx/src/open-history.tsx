import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "cleanshot://open-history";
  open(url);
  await closeMainWindow();
};
