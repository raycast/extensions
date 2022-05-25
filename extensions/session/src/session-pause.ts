import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "session:///pause";
  open(url);
  await closeMainWindow();
};
