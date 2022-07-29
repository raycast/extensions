import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "cleanshot://self-timer";
  open(url);
  await closeMainWindow();
};
