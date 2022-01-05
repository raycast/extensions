import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "cleanshot://record-screen";
  open(url);
  await closeMainWindow();
};
