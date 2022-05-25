import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "session:///start";
  open(url);
  await closeMainWindow();
};
