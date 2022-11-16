import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "phpmon://list";
  await open(url);
  await closeMainWindow();
};
