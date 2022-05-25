import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "session:///abandon";
  open(url);
  await closeMainWindow();
};
