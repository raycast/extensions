import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "session:///finish";
  open(url);
  await closeMainWindow();
};
