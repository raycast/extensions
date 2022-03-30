import open from "open";
import { closeMainWindow } from "@raycast/api";

export default async () => {
  const url = "phpmon://services/restart/all";
  await open(url);
  await closeMainWindow();
};
